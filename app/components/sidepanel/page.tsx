'use client';

import { useState, useEffect } from 'react';
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
  Link,
} from 'lucide-react';
import supabase from '@/lib/client';

interface SubmenuPermission {
  view: boolean;
  edit: boolean;
}

interface ScreenPermission {
  view: boolean;
  edit: boolean;
  submenus?: Record<string, SubmenuPermission>;
}

interface AccessPermissions {
  client?: ScreenPermission;
  product?: ScreenPermission;
  orders?: ScreenPermission;
  report?: ScreenPermission;
}

export default function Sidepanel() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const isProductPage = pathname?.startsWith('/admin/dashboard/product');
    const isClientPage = pathname?.startsWith('/admin/dashboard/client');
    const isOrderPage = pathname?.startsWith('/admin/dashboard/order');
    const isReportPage = pathname?.startsWith('/admin/dashboard/report');
    return {
      product: isProductPage,
      client: isClientPage,
      orders: isOrderPage,
      report: isReportPage,
    };
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('Admin');
  const [accessPermissions, setAccessPermissions] = useState<AccessPermissions | null>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Load user role and permissions
  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setPermissionsLoaded(true);
          return;
        }

        // Get user role
        const { data: userData } = await supabase
          .from('admin_user')
          .select('admin_role, admin_auth_id')
          .eq('admin_auth_id', session.user.id)
          .single();

        if (userData) {
          setUserRole(userData.admin_role);

          // If Staff, load permissions
          if (userData.admin_role === 'Staff') {
            const { data: permData, error: permError } = await supabase
              .from('admin_access_permissions')
              .select('permissions')
              .eq('admin_auth_id', userData.admin_auth_id)
              .single();

            // Ignore errors (table might not exist yet or no permissions set)
            if (permData?.permissions && !permError) {
              setAccessPermissions(permData.permissions as AccessPermissions);
            }
          }
        }
      } catch (err) {
        console.error('Error loading permissions:', err);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    loadUserPermissions();
  }, []);

  const toggleSubmenu = (menu: string) => {
    if (isCollapsed) return;
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const allMenuItems = [
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
        { id: 'statement', label: 'Client Statement', path: '/admin/dashboard/client/statement' },
        { id: 'quotation', label: 'Client Quotation', path: '/admin/dashboard/client/quotation' }
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
      submenu: [
        { id: 'order', label: 'Client Order', path: '/admin/dashboard/order' },
        { id: 'online-order', label: 'Online Order', path: '/admin/dashboard/order/onlineOrder' },
      ]
    },
    {
      id: 'report',
      label: 'Reports',
      icon: FileText,
      submenu: [
        { id: 'product-analysis', label: 'Product Analysis (Product)', path: '/admin/dashboard/report' },
        { id: 'product-analysis-customer', label: 'Product Analysis (Client)', path: '/admin/dashboard/report/productAnalysisClient' },
        { id: 'delivery-list', label: 'Delivery Report', path: '/admin/dashboard/report/deliveryList' }
      ]
    },
    {
      id: 'xero',
      label: 'Xero Integration',
      icon: Link,
      path: '/admin/dashboard/xero'
    }
  ];

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(item => {
    // Dashboard is always visible
    if (item.id === 'dashboard') return true;

    // Admin users see everything
    if (userRole === 'Admin') return true;

    // Staff users - check permissions
    if (userRole === 'Staff' && accessPermissions) {
      const screenPerm = accessPermissions[item.id as keyof AccessPermissions];
      return screenPerm?.view === true;
    }

    // Default: show if no permissions loaded yet (or User role)
    return true;
  }).map(item => {
    // Filter submenus for Staff users
    if (item.submenu && userRole === 'Staff' && accessPermissions) {
      const screenPerm = accessPermissions[item.id as keyof AccessPermissions];
      if (screenPerm?.submenus) {
        const filteredSubmenu = item.submenu.filter(sub => {
          const submenuPerm = screenPerm.submenus?.[sub.id];
          return submenuPerm?.view === true;
        });
        return { ...item, submenu: filteredSubmenu };
      }
    }
    return item;
  }).filter(item => {
    // Remove parent items with no visible submenus
    if (item.submenu && item.submenu.length === 0) return false;
    return true;
  });

  return (
    <>
      {/* Sidebar animations */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.97);
          }
        }

        .sidebar-link {
          position: relative;
          overflow: hidden;
        }

        .sidebar-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s ease;
        }

        .sidebar-link:hover::before {
          left: 100%;
        }

        .sidebar-link:active {
          animation: pulse 0.2s ease;
        }

        .submenu-container {
          animation: slideDown 0.3s ease-out forwards;
          overflow: hidden;
        }

        .submenu-item {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .submenu-item:nth-child(1) { animation-delay: 0.05s; }
        .submenu-item:nth-child(2) { animation-delay: 0.1s; }
        .submenu-item:nth-child(3) { animation-delay: 0.15s; }
        .submenu-item:nth-child(4) { animation-delay: 0.2s; }

        .active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: #FF5226;
          border-radius: 0 4px 4px 0;
          animation: fadeIn 0.3s ease-out;
        }

        .menu-icon {
          transition: transform 0.3s ease, color 0.3s ease;
        }

        .sidebar-link:hover .menu-icon {
          transform: scale(1.1);
        }

        .chevron-icon {
          transition: transform 0.3s ease;
        }

        .chevron-icon.expanded {
          transform: rotate(180deg);
        }
      `}</style>

      <aside
        className={`shadow-lg flex flex-col transition-all duration-300 ease-in-out relative ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{ backgroundColor: '#7A1F1F', minHeight: '100vh' }}
      >
        {/* Header */}
        <div
          className="p-4 relative flex items-center justify-center transition-all duration-300"
          style={{ borderBottom: '2px solid #FF5226', fontFamily: 'Egyptienne MN, serif', minHeight: '68px' }}
        >
          {!isCollapsed ? (
            <h1 className="text-xl font-bold text-white text-center leading-tight pr-1 transition-opacity duration-300">
              Gelato Wholesale Collective
            </h1>
          ) : (
            <h1 className="text-xl font-bold text-white text-center leading-tight transition-opacity duration-300">
              GWC
            </h1>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-1/2 -translate-y-1/2 text-white rounded-full p-1 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 z-10"
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
                    className={`sidebar-link w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                      isCollapsed ? 'justify-center' : ''
                    } text-white hover:bg-white hover:text-gray-800`}
                    title={isCollapsed ? item.label : ''}
                    aria-expanded={!isCollapsed && expandedMenus[item.id]}
                  >
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                      <item.icon size={20} className="menu-icon shrink-0" />
                      {!isCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap transition-all duration-200">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        size={16}
                        className={`chevron-icon shrink-0 ${expandedMenus[item.id] ? 'expanded' : ''}`}
                      />
                    )}
                  </button>

                  {expandedMenus[item.id] && !isCollapsed && (
                    <div className="submenu-container mt-1 space-y-1 ml-4">
                      {item.submenu.map((subitem, index) => (
                        <Link
                          key={subitem.id}
                          href={subitem.path}
                          className={`submenu-item sidebar-link relative block px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                            pathname === subitem.path
                              ? 'bg-white text-gray-800 shadow-sm'
                              : 'text-white hover:bg-white hover:text-gray-800'
                          }`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {pathname === subitem.path && <span className="active-indicator" />}
                          {subitem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.path}
                  className={`sidebar-link relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    pathname === item.path
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-white hover:bg-white hover:text-gray-800'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  {pathname === item.path && <span className="active-indicator" />}
                  <item.icon size={20} className="menu-icon shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium whitespace-nowrap transition-all duration-200">
                      {item.label}
                    </span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className={`p-4 text-white text-xs text-center transition-all duration-300 ${
            isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'
          }`}
          style={{ borderTop: isCollapsed ? 'none' : '2px solid #FF5226' }}
        >
          <div className="mt-1">Version 1.0 © 2025 All Rights Reserved</div>
        </div>
      </aside>
    </>
  );
}
