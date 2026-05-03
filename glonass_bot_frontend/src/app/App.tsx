import { useState } from 'react';
import { UsersPage } from '../pages/users/UsersPage';
import { PostsPage } from '../pages/posts/PostsPage';

function App() {
    const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                                activeTab === 'users'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            👥 Пользователи
                        </button>
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                                activeTab === 'posts'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📝 Посты
                        </button>
                    </div>
                </div>
            </nav>

            <main>
                {activeTab === 'users' ? <UsersPage /> : <PostsPage />}
            </main>
        </div>
    );
}

export default App;