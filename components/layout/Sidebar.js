import Link from 'next/link';

export default function Sidebar() {
  const links = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Orders', href: '#' },
    { name: 'Production', href: '#' },
    { name: 'Inventory', href: '#' },
    { name: 'Purchase', href: '#' },
    { name: 'Quality', href: '#' },
    { name: 'Packing', href: '#' },
    { name: 'Export', href: '#' },
    { name: 'Reports', href: '#' },
    { name: 'Settings', href: '#' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-wider">GARMENT<span className="text-blue-400">ERP</span></h1>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.name}>
              <Link 
                href={link.href}
                className={`block px-6 py-2.5 text-sm font-medium transition-colors ${
                  link.name === 'Dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        <p>ERP Modules (Mock)</p>
      </div>
    </div>
  );
}
