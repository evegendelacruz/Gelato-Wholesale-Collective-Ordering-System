'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home,
  User,
  Package,
  ShoppingCart,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function Sidepanel() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
  const isProductPage = pathname?.startsWith('/admin/dashboard/product');
  return isProductPage ? { product: true } : {};
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSubmenu = (menu: string) => {
    if (isCollapsed) return;
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/admin/dashboard'
    },
    {
      id: 'client',
      label: 'Client Account',
      icon: User,
      submenu: [
        { id: 'client', label: 'Client Account', path: '/admin/dashboard/client' },
        { id: 'statement', label: 'Client Statement', path: '/admin/dashboard/client/statement' }
      ]
    },
    {
      id: 'product',
      label: 'Product',
      icon: Package,
      submenu: [
        { id: 'product-list', label: 'Product List', path: '/admin/dashboard/product' },
        { id: 'ingredients', label: 'Ingredients', path: '/admin/dashboard/product/ingredients' }
      ]
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingCart,
      path: '/admin/dashboard/order'
    },
    {
      id: 'report',
      label: 'Reports',
      icon: FileText,
      submenu: [
        { id: 'product-analysis', label: 'Product Analysis (Product)', path: '/admin/dashboard/report' },
        { id: 'product-analysis-customer', label: 'Product Analysis (Client)', path: '/admin/dashboard/report/productAnalysisClient' },
        { id: 'delivery-list', label: 'Delivery List', path: '/admin/dashboard/report/deliveryList' }
      ]
    }
  ];

  return (
    <aside 
      className={`shadow-lg flex flex-col transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: '#7A1F1F', minHeight: '100vh' }}
    >
      {/* Header */}
      <div className="p-4 relative flex items-center justify-center" style={{ borderBottom: '2px solid #FF5226', fontFamily: 'Egyptienne MN, serif', minHeight: '68px' }}>
        {!isCollapsed ? (
          <h1 className="text-xl font-bold text-white text-center leading-tight pr-1">
            Gelato Wholesale Collective
          </h1>
        ) : (
          <h1 className="text-xl font-bold text-white text-center leading-tight">
            GWC
          </h1>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 text-white rounded-full p-1 shadow-lg hover:opacity-90 transition-all z-10"
          style={{ backgroundColor: '#FF5226', right: '-12px' }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleSubmenu(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded transition-colors ${
                    isCollapsed ? 'justify-center' : ''
                  } text-white hover:bg-white hover:bg-opacity-60 hover:text-black`}
                  title={isCollapsed ? item.label : ''}
                  aria-expanded={!isCollapsed && expandedMenus[item.id]}
                >
                  <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <item.icon size={20} className="shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    expandedMenus[item.id] ? 
                      <ChevronUp size={16} className="shrink-0" /> : 
                      <ChevronDown size={16} className="shrink-0" />
                  )}
                </button>

                {expandedMenus[item.id] && !isCollapsed && (
                  <div className="mt-1 space-y-1 ml-4 overflow-hidden">
                    {item.submenu.map((subitem) => (
                     <Link
                          key={subitem.id}
                          href={subitem.path}
                          className={`block px-4 py-2.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                            pathname === subitem.path
                              ? 'bg-white text-gray-800'
                              : 'text-white hover:bg-white hover:bg-opacity-60 hover:text-black'
                          }`}
                        >
                        {subitem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    pathname === item.path
                      ? 'bg-white text-gray-800'
                      : 'text-white hover:bg-white hover:bg-opacity-60 hover:text-black'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                <item.icon size={20} className="shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div 
          className="p-4 text-white text-xs text-center transition-opacity duration-300" 
          style={{ borderTop: '2px solid #FF5226' }}
        >
          <div className="mt-1">Version 1.0 © 2025 All Rights Reserved</div>
        </div>
      )}
    </aside>
  );
}