'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Image as ImageIcon, ChevronDown } from 'lucide-react';
import supabase from '@/lib/client';
import Image from 'next/image';

interface Ingredient {
  id: number;
  product_id: string;
  product_name: string;
  product_ingredient: string | null;
  product_allergen: string | null;
  product_image: string | null;
  product_created_at: string;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function IngredientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'has-ingredient' | 'has-allergen' | 'no-ingredient' | 'no-allergen'>('all');
  const itemsPerPage = 10;

  const [editFormData, setEditFormData] = useState({
    product_ingredient: '',
    product_allergen: ''
  });

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (!target.closest('.sort-dropdown') && 
          !target.closest('.filter-dropdown')) {
        setIsSortDropdownOpen(false);
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_list')
        .select('id, product_id, product_name, product_ingredient, product_allergen, product_image, product_created_at')
        .order('id', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      setMessage({ type: 'error', text: 'Failed to load ingredients' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (ingredient: Ingredient) => {
    setSelectedRow(ingredient.id);
    setSelectedIngredient(ingredient);
    setEditFormData({
      product_ingredient: ingredient.product_ingredient || '',
      product_allergen: ingredient.product_allergen || ''
    });
    setIsViewModalOpen(true);
  };

  const handleEdit = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedIngredient) return;

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('product_list')
        .update({
          product_ingredient: editFormData.product_ingredient || null,
          product_allergen: editFormData.product_allergen || null
        })
        .eq('id', selectedIngredient.id);

      if (updateError) throw updateError;

      await fetchIngredients();
      setIsEditModalOpen(false);
      setSelectedRow(null);
      setSelectedIngredient(null);
      setEditFormData({
        product_ingredient: '',
        product_allergen: ''
      });

      setMessage({ 
        type: 'success', 
        text: 'Ingredient information has been updated successfully.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error) {
      console.error('Error updating ingredient:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update ingredient. Please try again.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedRow(null);
    setSelectedIngredient(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedIngredient(null);
    setEditFormData({
      product_ingredient: '',
      product_allergen: ''
    });
  };

  const filteredIngredients = ingredients
    .filter(ingredient => {
      const matchesSearch = 
        ingredient.product_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ingredient.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ingredient.product_ingredient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ingredient.product_allergen?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterBy === 'has-ingredient') return ingredient.product_ingredient !== null && ingredient.product_ingredient !== '';
      if (filterBy === 'has-allergen') return ingredient.product_allergen !== null && ingredient.product_allergen !== '';
      if (filterBy === 'no-ingredient') return ingredient.product_ingredient === null || ingredient.product_ingredient === '';
      if (filterBy === 'no-allergen') return ingredient.product_allergen === null || ingredient.product_allergen === '';
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.product_created_at).getTime() - new Date(a.product_created_at).getTime();
        case 'oldest':
          return new Date(a.product_created_at).getTime() - new Date(b.product_created_at).getTime();
        case 'name-asc':
          return a.product_name.localeCompare(b.product_name);
        case 'name-desc':
          return b.product_name.localeCompare(a.product_name);
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIngredients = filteredIngredients.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          {message.text && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 20px',
              borderRadius: '8px',
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              color: message.type === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{message.text}</span>
              <button
                onClick={() => setMessage({ type: '', text: '' })}
                className="ml-4 text-current hover:opacity-70"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Ingredients
              </h1>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="relative sort-dropdown">
                  <button 
                    onClick={() => {
                      setIsSortDropdownOpen(!isSortDropdownOpen);
                      setIsFilterDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown size={20} />
                    <span>Sort</span>
                  </button>
                  
                  {isSortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSortBy('newest');
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'newest' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('oldest');
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'oldest' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          Oldest First
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('name-asc');
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'name-asc' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          Name (A-Z)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('name-desc');
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'name-desc' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          Name (Z-A)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative filter-dropdown">
                  <button 
                    onClick={() => {
                      setIsFilterDropdownOpen(!isFilterDropdownOpen);
                      setIsSortDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Filter size={20} />
                    <span>Filter</span>
                  </button>
                  
                  {isFilterDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setFilterBy('all');
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'all' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          All Items
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => {
                            setFilterBy('has-ingredient');
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'has-ingredient' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          Has Ingredients
                        </button>
                        <button
                          onClick={() => {
                            setFilterBy('no-ingredient');
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'no-ingredient' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          No Ingredients
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => {
                            setFilterBy('has-allergen');
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'has-allergen' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          Has Allergens
                        </button>
                        <button
                          onClick={() => {
                            setFilterBy('no-allergen');
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'no-allergen' ? 'bg-orange-50 text-orange-600' : ''}`}
                        >
                          No Allergens
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-3 px-4 w-12"></th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      PRODUCT ID
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      PRODUCT NAME
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      INGREDIENTS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ALLERGEN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Loading ingredients...
                      </td>
                    </tr>
                  ) : currentIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No ingredients found matching your search.' : 'No ingredients found.'}
                      </td>
                    </tr>
                  ) : (
                    currentIngredients.map((ingredient) => (
                      <tr 
                        key={ingredient.id} 
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(ingredient)}
                      >
                        <td className="py-3 px-4">
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedRow === ingredient.id 
                                ? 'border-orange-500 bg-orange-500' 
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedRow === ingredient.id && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{ingredient.product_id}</td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-3">
                            {ingredient.product_image ? (
                              <Image 
                                src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${ingredient.product_image}`}
                                alt={ingredient.product_name}
                                width={40}
                                height={40}
                                className="w-10 h-10 object-cover rounded"
                                unoptimized
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <ImageIcon size={20} className="text-gray-400" />
                              </div>
                            )}
                            <span>{ingredient.product_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{ingredient.product_ingredient || '-'}</td>
                        <td className="py-3 px-4 text-sm">{ingredient.product_allergen || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filteredIngredients.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#5C2E1F' }}
                >
                  Previous
                </button>
                
                <span className="text-sm" style={{ color: '#5C2E1F' }}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#5C2E1F' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedIngredient && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
                  View Ingredient Details
                </h2>
                <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  {selectedIngredient.product_image ? (
                    <Image 
                      src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${selectedIngredient.product_image}`}
                      alt={selectedIngredient.product_name}
                      width={200}
                      height={200}
                      className="w-48 h-48 object-cover rounded-lg"
                      unoptimized
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon size={48} className="text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product ID
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm">
                      {selectedIngredient.product_id}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product Name
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm">
                      {selectedIngredient.product_name}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Ingredients
                  </label>
                  <div className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm min-h-25">
                    {selectedIngredient.product_ingredient || '-'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Allergen
                  </label>
                  <div className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm min-h-25">
                    {selectedIngredient.product_allergen || '-'}
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleEdit}
                    className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedIngredient && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
                  Edit Ingredient Details
                </h2>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  {selectedIngredient.product_image ? (
                    <Image 
                      src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${selectedIngredient.product_image}`}
                      alt={selectedIngredient.product_name}
                      width={200}
                      height={200}
                      className="w-48 h-48 object-cover rounded-lg"
                      unoptimized
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon size={48} className="text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product ID
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm">
                      {selectedIngredient.product_id}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product Name
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm">
                      {selectedIngredient.product_name}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Ingredients
                  </label>
                  <textarea
                    value={editFormData.product_ingredient}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, product_ingredient: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Enter ingredients..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Allergen
                  </label>
                  <textarea
                    value={editFormData.product_allergen}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, product_allergen: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Enter allergens..."
                  />
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={closeEditModal}
                    className="px-12 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="px-12 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}