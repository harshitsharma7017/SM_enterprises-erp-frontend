export default function Header({ user, onLogout }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-gray-800">Dashboard Overview</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex flex-col text-right">
          <span className="text-sm font-medium text-gray-900">{user?.name || 'User'}</span>
          <span className="text-xs text-gray-500">{user?.email || ''}</span>
        </div>
        
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
          {user?.name?.charAt(0) || 'U'}
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        <button 
          onClick={onLogout}
          className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
