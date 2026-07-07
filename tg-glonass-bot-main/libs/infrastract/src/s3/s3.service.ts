import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import {
    CreateBucketCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    PutObjectCommand,
    PutBucketPolicyCommand,
    S3Client
} from "@aws-sdk/client-s3";
import * as crypto from 'crypto';

interface S3UploadData {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
    private s3: S3Client;
    private bucket: string;
    private publicEndpoint: string;
    private readonly logger = new Logger(S3Service.name);

    constructor(private readonly config: ConfigService) {
        const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
        this.bucket = this.config.getOrThrow('S3_BUCKET');

        const internalEndpoint = this.normalizeEndpoint(
            this.config.get('S3_INTERNAL_ENDPOINT') || this.config.get('S3_URL') || 'http://minio:3456',
            isDocker,
        );
        this.publicEndpoint = this.resolvePublicEndpoint(internalEndpoint, isDocker);
        
        const usePathStyle = internalEndpoint.includes('localhost') || internalEndpoint.includes('minio');
        
        this.s3 = new S3Client({
            region: this.config.getOrThrow('S3_REGION'),
            credentials: {
                accessKeyId: this.config.getOrThrow('S3_USER'),
                secretAccessKey: this.config.getOrThrow('S3_PASSWORD'),
            },
            endpoint: internalEndpoint,
            forcePathStyle: usePathStyle,
        });

        this.logger.log(`S3 configured: internal=${internalEndpoint}, public=${this.publicEndpoint}, bucket=${this.bucket}`);
    }

    private normalizeEndpoint(endpoint: string, isDocker: boolean): string {
        if (isDocker) return endpoint;
        return endpoint.replace('://minio:', '://localhost:');
    }

    private trimTrailingSlash(value: string): string {
        return value.endsWith('/') ? value.slice(0, -1) : value;
    }

    private isDockerOnlyEndpoint(endpoint: string): boolean {
        try {
            return ['minio', '0.0.0.0'].includes(new URL(endpoint).hostname);
        } catch {
            return endpoint.includes('://minio:') || endpoint.includes('://0.0.0.0:');
        }
    }

    private resolvePublicEndpoint(internalEndpoint: string, isDocker: boolean): string {
        const configuredEndpoint = this.config.get<string>('S3_PUBLIC_ENDPOINT') || this.config.get<string>('S3_ENDPOINT');
        const normalizedConfiguredEndpoint = configuredEndpoint
            ? this.normalizeEndpoint(configuredEndpoint, isDocker)
            : undefined;
        const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL');

        if (
            isDocker &&
            publicBaseUrl &&
            (!normalizedConfiguredEndpoint || this.isDockerOnlyEndpoint(normalizedConfiguredEndpoint))
        ) {
            return `${this.trimTrailingSlash(publicBaseUrl)}/${this.bucket}`;
        }

        return normalizedConfiguredEndpoint || internalEndpoint;
    }

    async onModuleInit() {
        await this.ensureBucketExists();
    }

    async uploadFile(file: S3UploadData): Promise<{ url: string; key: string }> {
    const extension = file.originalname.includes('.')
        ? file.originalname.split('.').pop()?.toLowerCase()
        : undefined;

    const safeExtension = extension ? `.${extension}` : '';
    const fileName = `${Date.now()}-${crypto.randomUUID()}${safeExtension}`;

    try {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            }),
        );

        const cleanPublicEndpoint = this.trimTrailingSlash(this.publicEndpoint);

        const publicUrl = `${cleanPublicEndpoint}/${fileName}`;

        this.logger.log(`File uploaded: ${fileName}`);
        this.logger.log(`Public URL: ${publicUrl}`);

        return {
            url: publicUrl,
            key: fileName,
        };
    } catch (error) {
        this.logger.error('S3 Upload Error:', error);
        throw new Error(`Failed to upload file to storage: ${error.message}`);
    }
}

    async deleteFile(key: string): Promise<void> {
        try {
            await this.s3.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
            this.logger.log(`File deleted: ${key}`);
        } catch (error) {
            this.logger.error('S3 Delete Error:', error);
            throw new Error(`Failed to delete file from storage: ${error.message}`);
        }
    }

    async ensureBucketExists(): Promise<void> {
        try {
            await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`S3 Bucket "${this.bucket}" already exists.`);
        } catch (error) {
            this.logger.log(`Bucket "${this.bucket}" not found. Creating...`);
            await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`Bucket "${this.bucket}" created.`);
        }

        const publicPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: ["s3:GetObject"],
                    Effect: "Allow",
                    Principal: "*",
                    Resource: [`arn:aws:s3:::${this.bucket}/*`],
                },
            ],
        };

        try {
            await this.s3.send(new PutBucketPolicyCommand({
                Bucket: this.bucket,
                Policy: JSON.stringify(publicPolicy),
            }));
            this.logger.log(`Public policy applied to "${this.bucket}".`);
        } catch (policyError) {
            this.logger.warn(`Failed to apply public policy: ${policyError.message}`);
        }
    }

    async getFileUrl(key: string): Promise<string> {
        const cleanPublicEndpoint = this.trimTrailingSlash(this.publicEndpoint);

        return `${cleanPublicEndpoint}/${key}`;
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
            return true;
        } catch (error) {
            this.logger.error('S3 Connection Test Failed:', error);
            return false;
        }
    }
}
