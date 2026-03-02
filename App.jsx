const { useState, useEffect } = React;

// External viewer password - change this to whatever you want
const VIEWER_PASSWORD = 'viewer123';

function App() {
  const [view, setView] = useState('login'); // 'login', 'public', 'admin', 'admin-login'
  const [viewerName, setViewerName] = useState('');
  const [articles, setArticles] = useState([]);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load branding
      const { data: brandingData } = await supabase
        .from('branding')
        .select('*')
        .single();
      setBranding(brandingData);

      // Load published articles
      const { data: articlesData } = await supabase
        .from('articles')
        .select('*')
        .eq('published', true)
        .order('updated_at', { ascending: false });
      setArticles(articlesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Log article view
  async function logView(articleId) {
    try {
      await supabase.from('article_views').insert({
        article_id: articleId,
        viewer_name: viewerName,
      });
    } catch (err) {
      console.error('Error logging view:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Login Screen
  if (view === 'login') {
    return (
      <LoginScreen 
        branding={branding}
        onLogin={(name) => {
          setViewerName(name);
          setView('public');
        }}
        onAdminClick={() => setView('admin-login')}
      />
    );
  }

  // Admin Login
  if (view === 'admin-login') {
    return (
      <AdminLogin 
        branding={branding}
        onBack={() => setView('login')}
        onSuccess={() => setView('admin')}
      />
    );
  }

  // Admin Dashboard
  if (view === 'admin') {
    return (
      <AdminDashboard 
        branding={branding}
        onLogout={() => setView('login')}
        onBrandingUpdate={(newBranding) => setBranding(newBranding)}
        onArticlesUpdate={(newArticles) => setArticles(newArticles.filter(a => a.published))}
      />
    );
  }

  // Article Detail View
  if (selectedArticle) {
    return (
      <ArticleView 
        article={selectedArticle}
        branding={branding}
        viewerName={viewerName}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  // Public Article List
  return (
    <PublicPortal 
      articles={articles}
      branding={branding}
      viewerName={viewerName}
      onSelectArticle={(article) => {
        logView(article.id);
        setSelectedArticle(article);
      }}
      onLogout={() => {
        setViewerName('');
        setView('login');
      }}
      onAdminClick={() => setView('admin-login')}
    />
  );
}

// ============ LOGIN SCREEN ============
function LoginScreen({ branding, onLogin, onAdminClick }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleLogin() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password !== VIEWER_PASSWORD) {
      setError('Invalid password');
      return;
    }
    onLogin(name.trim());
  }

  const primaryColor = branding?.primary_color || '#3b82f6';
  const accentColor = branding?.accent_color || '#8b5cf6';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            🔒
          </div>
          <h1 className="text-2xl font-bold text-white">{branding?.logo_text || 'Knowledgebase'}</h1>
          <p className="text-slate-400 mt-2">{branding?.tagline || 'Enter your details to access articles'}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Access Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            className="w-full text-white font-semibold py-3 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            Access Articles
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <button 
            onClick={onAdminClick}
            className="text-slate-400 hover:text-white text-sm"
          >
            Team login →
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PUBLIC PORTAL ============
function PublicPortal({ articles, branding, viewerName, onSelectArticle, onLogout, onAdminClick }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const primaryColor = branding?.primary_color || '#3b82f6';
  const accentColor = branding?.accent_color || '#8b5cf6';

  const categories = [...new Set(articles.map(a => a.category))];
  
  const filtered = articles.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                       a.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || a.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero */}
      <div 
        className="relative py-16 px-6"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">{branding?.logo_text || 'Knowledgebase'}</h1>
          <p className="text-white/80 mb-8">{branding?.tagline || 'Find answers to your questions'}</p>
          
          <div className="max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-6 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Top right buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <span className="text-white/70 text-sm">Hi, {viewerName}</span>
          <button 
            onClick={onLogout}
            className="px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30"
          >
            Logout
          </button>
          <button 
            onClick={onAdminClick}
            className="px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setCategory('')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !category ? 'text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              style={!category ? { backgroundColor: primaryColor } : {}}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  category === cat ? 'text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                style={category === cat ? { backgroundColor: primaryColor } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Articles */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-4">📄</p>
            <p>No articles found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(article => (
              <div 
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className="bg-slate-800 rounded-xl p-6 cursor-pointer hover:bg-slate-750 transition-colors border-l-4"
                style={{ borderLeftColor: primaryColor }}
              >
                <h3 className="text-lg font-semibold mb-2" style={{ color: primaryColor }}>
                  {article.title}
                </h3>
                <p className="text-slate-400 text-sm mb-3">{article.content?.substring(0, 150)}...</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{article.category}</span>
                  <span>•</span>
                  <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ARTICLE VIEW ============
function ArticleView({ article, branding, viewerName, onBack }) {
  const primaryColor = branding?.primary_color || '#3b82f6';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white"
          >
            ← Back
          </button>
          <span className="text-slate-400 text-sm">Viewing as {viewerName}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <article className="bg-slate-800 rounded-xl p-8">
          <div className="mb-6">
            <span 
              className="px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: primaryColor + '30', color: primaryColor }}
            >
              {article.category}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
          
          <div className="text-slate-400 text-sm mb-8 pb-6 border-b border-slate-700">
            By {article.author_name} • Updated {new Date(article.updated_at).toLocaleDateString()}
          </div>
          
          <div className="prose prose-invert max-w-none">
            {article.content?.split('\n').map((p, i) => (
              <p key={i} className="mb-4 text-slate-300">{p}</p>
            ))}
          </div>

          {article.tags?.length > 0 && (
            <div className="flex gap-2 mt-8 pt-6 border-t border-slate-700">
              {article.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}

// ============ ADMIN LOGIN ============
function AdminLogin({ branding, onBack, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const primaryColor = branding?.primary_color || '#3b82f6';
  const accentColor = branding?.accent_color || '#8b5cf6';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            🛡️
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-slate-400 mt-2">Sign in to manage articles</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder="admin@company.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder="Enter password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">
            ← Back to viewer login
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard({ branding, onLogout, onBrandingUpdate, onArticlesUpdate }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'edit', 'branding', 'view'
  const [editingArticle, setEditingArticle] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('updated_at', { ascending: false });
      setArticles(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  async function saveArticle(article) {
    try {
      if (article.id) {
        const { data } = await supabase
          .from('articles')
          .update({
            title: article.title,
            content: article.content,
            category: article.category,
            published: article.published,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id)
          .select()
          .single();
      } else {
        const { data } = await supabase
          .from('articles')
          .insert({
            title: article.title,
            content: article.content,
            category: article.category,
            published: article.published,
            author_name: user?.email || 'Admin',
            author_id: user?.id
          })
          .select()
          .single();
      }
      await loadAdminData();
      setView('list');
      setEditingArticle(null);
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save article');
    }
  }

  async function deleteArticle(id) {
    if (!confirm('Delete this article?')) return;
    try {
      await supabase.from('articles').delete().eq('id', id);
      await loadAdminData();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  }

  async function togglePublish(article) {
    try {
      await supabase
        .from('articles')
        .update({ published: !article.published })
        .eq('id', article.id);
      await loadAdminData();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  const primaryColor = branding?.primary_color || '#3b82f6';
  const accentColor = branding?.accent_color || '#8b5cf6';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // View article in admin
  if (view === 'view') {
    return (
      <AdminArticleView 
        article={viewingArticle}
        branding={branding}
        onBack={() => {
          setView('list');
          setViewingArticle(null);
        }}
      />
    );
  }

  // Branding Editor
  if (view === 'branding') {
    return (
      <BrandingEditor 
        branding={branding}
        onSave={(newBranding) => {
          onBrandingUpdate(newBranding);
          setView('list');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  // Article Editor
  if (view === 'edit') {
    return (
      <ArticleEditor 
        article={editingArticle}
        branding={branding}
        onSave={saveArticle}
        onCancel={() => {
          setView('list');
          setEditingArticle(null);
        }}
      />
    );
  }

  // Article List
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              📚
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">{articles.length} articles</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('branding')}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30"
            >
              🎨 Branding
            </button>
            <span className="text-slate-400 text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Articles</h2>
          <button
            onClick={() => {
              setEditingArticle(null);
              setView('edit');
            }}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            + New Article
          </button>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-4">📝</p>
            <p>No articles yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map(article => (
              <div key={article.id} className="bg-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{article.title}</h3>
                    {!article.published && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">Draft</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{article.category} • {new Date(article.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewingArticle(article);
                      setView('view');
                    }}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
                  >
                    View
                  </button>
                  <button
                    onClick={() => togglePublish(article)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      article.published 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {article.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingArticle(article);
                      setView('edit');
                    }}
                    className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm hover:bg-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteArticle(article.id)}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ADMIN ARTICLE VIEW ============
function AdminArticleView({ article, branding, onBack }) {
  const primaryColor = branding?.primary_color || '#3b82f6';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white"
          >
            ← Back
          </button>
          <span className="text-slate-400 text-sm">Admin Preview</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <article className="bg-slate-800 rounded-xl p-8">
          <div className="mb-6">
            <span 
              className="px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: primaryColor + '30', color: primaryColor }}
            >
              {article.category}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
          
          <div className="text-slate-400 text-sm mb-8 pb-6 border-b border-slate-700">
            By {article.author_name} • Updated {new Date(article.updated_at).toLocaleDateString()}
          </div>
          
          <div className="prose prose-invert max-w-none">
            {article.content?.split('\n').map((p, i) => (
              <p key={i} className="mb-4 text-slate-300">{p}</p>
            ))}
          </div>

          {article.tags?.length > 0 && (
            <div className="flex gap-2 mt-8 pt-6 border-t border-slate-700">
              {article.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}

// ============ ARTICLE EDITOR ============
function ArticleEditor({ article, branding, onSave, onCancel }) {
  const [title, setTitle] = useState(article?.title || '');
  const [content, setContent] = useState(article?.content || '');
  const [category, setCategory] = useState(article?.category || 'General');
  const [published, setPublished] = useState(article?.published ?? false);
  const [saving, setSaving] = useState(false);

  const categories = ['Onboarding', 'Technical', 'Billing', 'General', 'Troubleshooting'];
  const primaryColor = branding?.primary_color || '#3b82f6';

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content');
      return;
    }
    setSaving(true);
    await onSave({
      id: article?.id,
      title,
      content,
      category,
      published
    });
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{article ? 'Edit Article' : 'New Article'}</h1>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl">
            <span className="text-slate-300">Published</span>
            <button
              onClick={() => setPublished(!published)}
              className={`w-12 h-7 rounded-full relative transition-colors ${published ? 'bg-green-500' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${published ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder="Article title"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm"
              placeholder="Write your article content here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ BRANDING EDITOR ============
function BrandingEditor({ branding, onSave, onCancel }) {
  const [logoText, setLogoText] = useState(branding?.logo_text || 'Knowledgebase');
  const [tagline, setTagline] = useState(branding?.tagline || 'Find answers to your questions');
  const [primaryColor, setPrimaryColor] = useState(branding?.primary_color || '#3b82f6');
  const [accentColor, setAccentColor] = useState(branding?.accent_color || '#8b5cf6');
  const [saving, setSaving] = useState(false);

  const colorPresets = [
    { primary: '#3b82f6', accent: '#8b5cf6', name: 'Blue/Purple' },
    { primary: '#10b981', accent: '#06b6d4', name: 'Green/Cyan' },
    { primary: '#f59e0b', accent: '#ef4444', name: 'Orange/Red' },
    { primary: '#ec4899', accent: '#8b5cf6', name: 'Pink/Purple' },
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('branding')
        .update({
          logo_text: logoText,
          tagline: tagline,
          primary_color: primaryColor,
          accent_color: accentColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', branding.id)
        .select()
        .single();

      if (error) throw error;
      onSave(data);
    } catch (err) {
      console.error('Error saving branding:', err);
      alert('Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🎨 Customize Branding</h1>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Logo Text</label>
            <input
              type="text"
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-3">Color Presets</label>
            <div className="flex gap-3">
              {colorPresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setAccentColor(preset.accent);
                  }}
                  className={`w-12 h-12 rounded-xl transition-transform hover:scale-110 ${
                    primaryColor === preset.primary ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                  }`}
                  style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})` }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Preview</label>
            <div 
              className="rounded-xl overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              <div className="p-6 text-center text-white">
                <h3 className="text-xl font-bold">{logoText}</h3>
                <p className="opacity-80 text-sm mt-1">{tagline}</p>
                <div className="mt-4 bg-white rounded-lg p-3 text-gray-400 text-sm">
                  Search for answers...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
