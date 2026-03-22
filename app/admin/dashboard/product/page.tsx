"use client";
import Sidepanel from "@/app/components/sidepanel/page";
import Header from "@/app/components/header/page";
import { ProductListSkeleton, SkeletonStyles } from "@/app/components/skeletonLoader/page";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Plus,
  X,
  Check,
  Image as ImageIcon,
  ChevronDown,
  Tag,
} from "lucide-react";
import supabase from "@/lib/client";
import { useAccessControl } from "@/lib/accessControl";
import Image from "next/image";
import {
  generateNextBbdCode,
  generateNextPbnCode,
  generate30DigitBarcode,
  generateStickerBlobUrl,
  downloadStickerPDF,
  generate13DigitBarcode,
  generateNextGpbnCode,
  calculateBBD,
  generateBarcodeStickerBlobUrl,
  generateProductStickerBlobUrl,
  downloadBarcodeStickerPDF,
  downloadProductStickerPDF,
  type StickerData,
  type BarcodeStickerData,
  type ProductStickerData,
} from "@/lib/stickerGenerator";

declare global {
  interface Window {
    storage: {
      get: (
        key: string,
        shared?: boolean
      ) => Promise<{ key: string; value: string; shared: boolean } | null>;
      set: (
        key: string,
        value: string,
        shared?: boolean
      ) => Promise<{ key: string; value: string; shared: boolean } | null>;
      delete: (
        key: string,
        shared?: boolean
      ) => Promise<{ key: string; deleted: boolean; shared: boolean } | null>;
      list: (
        prefix?: string,
        shared?: boolean
      ) => Promise<{ keys: string[]; prefix?: string; shared: boolean } | null>;
    };
  }
}
interface Product {
  id: number;
  product_id: string;
  product_name: string;
  product_type: string;
  product_gelato_type: string;
  product_weight: number;
  product_milkbased: number | null;
  product_sugarbased: number | null;
  product_shelflife: string;
  product_price: number;
  product_allergen: string | null;
  product_ingredient: string | null;
  product_image: string | null;
  product_created_at: string;
  product_billingName: string | null;
  product_description: string | null;
  product_cost: number | null;
  product_modified_at: string | null;
  sticker_bbd_code: string | null;
  sticker_pbn_code: string | null;
  sticker_barcode: string | null;
  // New sticker fields
  barcode_13digit: string | null;
  sticker_gpbn_code: string | null;
}

interface Message {
  type: "success" | "error" | "";
  text: string;
}

export default function ProductPage() {
  // Access Control
  const { canEdit } = useAccessControl();
  const canEditProducts = canEdit('product', 'product-list');

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<Message>({ type: "", text: "" });
  const itemsPerPage = 10;
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);
  const [isEditSuccessOpen, setIsEditSuccessOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "name-asc" | "name-desc" | "price-asc" | "price-desc"
  >("newest");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([]);
  const [gelatoTypeOptions, setGelatoTypeOptions] = useState<string[]>([]);
  const [newProductType, setNewProductType] = useState("");
  const [newGelatoType, setNewGelatoType] = useState("");
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<
    "product_type" | "gelato_type" | null
  >(null);
  const [addOptionLabel, setAddOptionLabel] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [availableClients, setAvailableClients] = useState<Array<{
    client_id: string;
    client_auth_id: string;
    client_businessName: string;
    client_person_incharge: string;
  }>>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateSourceProduct, setDuplicateSourceProduct] = useState<Product | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Sticker modal state
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string>("");
  const [stickerProduct, setStickerProduct] = useState<Product | null>(null);
  const [isGeneratingSticker, setIsGeneratingSticker] = useState(false);
  const [editableBbdCode, setEditableBbdCode] = useState<string>("");
  const [editablePbnCode, setEditablePbnCode] = useState<string>("");
  const [editableBarcode, setEditableBarcode] = useState<string>("");

  // New sticker types state
  const [stickerType, setStickerType] = useState<"barcode" | "product">("barcode");
  const [barcode13Digit, setBarcode13Digit] = useState<string>("");
  const [gpbnCode, setGpbnCode] = useState<string>("");
  const [bbdDate, setBbdDate] = useState<string>("");
  const [barcodeStickerPreviewUrl, setBarcodeStickerPreviewUrl] = useState<string>("");
  const [productStickerPreviewUrl, setProductStickerPreviewUrl] = useState<string>("");

  const [formData, setFormData] = useState({
    product_id: "",
    product_name: "",
    product_type: "",
    gelato_type: "",
    weight_kg: "",
    milk_based_kg: "",
    sugar_syrup_based_kg: "",
    shelf_life: "",
    price_sgd: "",
    allergen: "",
    ingredient: "",
    billing_name: "",
    description: "",
    cost: "",
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.actions-dropdown')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDuplicate = async (product: Product) => {
  setIsDuplicating(true);
  setDuplicateSourceProduct(product);
  
  // Generate new product ID for the duplicate
  const newProductId = await generateProductId();
  
  // Pre-fill form with duplicate data
  setFormData({
    product_id: newProductId,
    product_name: `${product.product_name} (Copy)`,
    product_type: product.product_type,
    gelato_type: product.product_gelato_type,
    weight_kg: product.product_weight.toString(),
    milk_based_kg: product.product_milkbased?.toString() || "",
    sugar_syrup_based_kg: product.product_sugarbased?.toString() || "",
    shelf_life: product.product_shelflife ?? "",
    price_sgd: product.product_price.toString(),
    allergen: product.product_allergen || "",
    ingredient: product.product_ingredient || "",
    billing_name: product.product_billingName || "",
    description: product.product_description || "",
    cost: product.product_cost?.toString() || "",
  });
  
  // Copy the product image preview if exists
  if (product.product_image) {
    setPhotoPreview(
      `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${product.product_image}`
    );
  }
  
  await fetchClients();
  setIsModalOpen(true);
  setActiveDropdown(null);
};


  useEffect(() => {
    const loadOptions = async () => {
      try {
        // Fetch from Supabase instead of window.storage
        const { data: productTypes, error: productTypeError } = await supabase
          .from("dropdown_options")
          .select("option_value")
          .eq("option_type", "product_type");

        const { data: gelatoTypes, error: gelatoTypeError } = await supabase
          .from("dropdown_options")
          .select("option_value")
          .eq("option_type", "gelato_type");

        if (!productTypeError && productTypes) {
          setProductTypeOptions(productTypes.map((item) => item.option_value));
        }

        if (!gelatoTypeError && gelatoTypes) {
          setGelatoTypeOptions(gelatoTypes.map((item) => item.option_value));
        }
      } catch (error) {
        console.error("Error loading options:", error);
      }
    };
    loadOptions();
  }, []);

    // Add function to fetch clients
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('client_user')
        .select('client_id, client_auth_id, client_businessName, client_person_incharge')
        .order('client_businessName', { ascending: true });

      if (error) throw error;
      setAvailableClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Add handler for client selection
  const handleClientSelection = (clientAuthId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedClients);
    if (isSelected) {
      newSelected.add(clientAuthId);
    } else {
      newSelected.delete(clientAuthId);
    }
    setSelectedClients(newSelected);
  };

  const handleRowClick = (product: Product) => {
    setViewProduct(product);
    setIsViewModalOpen(true);
  };

  // Handle sticker preview
  const handleStickerPreview = async (product: Product) => {
    setIsGeneratingSticker(true);
    setStickerProduct(product);
    setIsStickerModalOpen(true);
    setStickerType("barcode"); // Default to barcode sticker

    try {
      // ALWAYS fetch the latest product data from database to get current barcodes
      const { data: freshProductData, error: fetchError } = await supabase
        .from('product_list')
        .select('*')
        .eq('id', product.id)
        .single();

      if (fetchError) {
        console.error('Error fetching product data:', fetchError);
        throw fetchError;
      }

      // Use fresh data from database
      let bbdCode = freshProductData?.sticker_bbd_code || null;
      let pbnCode = freshProductData?.sticker_pbn_code || null;
      let barcode = freshProductData?.sticker_barcode || null;
      let barcode13 = freshProductData?.barcode_13digit || null;
      let gpbn = freshProductData?.sticker_gpbn_code || null;

      console.log('Fetched product barcodes from DB:', {
        bbdCode,
        pbnCode,
        barcode,
        barcode13,
        gpbn
      });

      // Generate old sticker codes if needed
      if (!bbdCode || !pbnCode || !barcode) {
        const { data: lastProduct } = await supabase
          .from('product_list')
          .select('sticker_bbd_code, sticker_pbn_code')
          .not('sticker_bbd_code', 'is', null)
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (!bbdCode) {
          bbdCode = generateNextBbdCode(lastProduct?.sticker_bbd_code || null);
        }
        if (!pbnCode) {
          pbnCode = generateNextPbnCode(lastProduct?.sticker_pbn_code || null);
        }
        if (!barcode) {
          barcode = generate30DigitBarcode(bbdCode, pbnCode);
        }
      }

      // Generate new sticker codes if needed
      if (!barcode13) {
        const { data: lastBarcode } = await supabase
          .from('product_list')
          .select('barcode_13digit')
          .not('barcode_13digit', 'is', null)
          .order('id', { ascending: false })
          .limit(1)
          .single();

        barcode13 = generate13DigitBarcode(lastBarcode?.barcode_13digit || null);
      }

      if (!gpbn) {
        const { data: lastGpbn } = await supabase
          .from('product_list')
          .select('sticker_gpbn_code')
          .not('sticker_gpbn_code', 'is', null)
          .order('id', { ascending: false })
          .limit(1)
          .single();

        gpbn = generateNextGpbnCode(lastGpbn?.sticker_gpbn_code || null);
      }

      // Only update database if we generated new codes
      const needsUpdate =
        bbdCode !== freshProductData?.sticker_bbd_code ||
        pbnCode !== freshProductData?.sticker_pbn_code ||
        barcode !== freshProductData?.sticker_barcode ||
        barcode13 !== freshProductData?.barcode_13digit ||
        gpbn !== freshProductData?.sticker_gpbn_code;

      if (needsUpdate) {
        const updateData: Record<string, string | null> = {
          sticker_bbd_code: bbdCode,
          sticker_pbn_code: pbnCode,
          sticker_barcode: barcode,
          barcode_13digit: barcode13,
          sticker_gpbn_code: gpbn,
        };

        await supabase
          .from('product_list')
          .update(updateData)
          .eq('id', product.id);

        // Update local state
        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? { ...p, ...updateData }
            : p
        ));
      }

      // Update the product reference with all fresh data
      const updatedProduct: Product = {
        ...product,
        ...freshProductData,
        sticker_bbd_code: bbdCode,
        sticker_pbn_code: pbnCode,
        sticker_barcode: barcode,
        barcode_13digit: barcode13,
        sticker_gpbn_code: gpbn,
      };
      setStickerProduct(updatedProduct);

      // Set editable codes (old sticker)
      setEditableBbdCode(bbdCode!);
      setEditablePbnCode(pbnCode!);
      setEditableBarcode(barcode!);

      // Set new sticker codes
      setBarcode13Digit(barcode13!);
      setGpbnCode(gpbn!);

      // Calculate BBD based on shelf life
      const bbdDateValue = calculateBBD(updatedProduct.product_shelflife || '3 months');
      setBbdDate(bbdDateValue);

      // Generate preview for old sticker
      const stickerData: StickerData = {
        productName: updatedProduct.product_name,
        ingredients: updatedProduct.product_ingredient || 'No ingredients listed',
        bbdCode: bbdCode!,
        pbnCode: pbnCode!,
        barcode: barcode!
      };
      const previewUrl = generateStickerBlobUrl(stickerData);
      setStickerPreviewUrl(previewUrl);

      // Generate Barcode Sticker preview
      const barcodeStickerData: BarcodeStickerData = {
        productName: updatedProduct.product_name,
        barcode13: barcode13!
      };
      const barcodePreview = generateBarcodeStickerBlobUrl(barcodeStickerData);
      setBarcodeStickerPreviewUrl(barcodePreview);

      // Generate Product Sticker preview
      const productStickerData: ProductStickerData = {
        productName: updatedProduct.product_name,
        ingredients: updatedProduct.product_ingredient || 'No ingredients listed',
        bbd: bbdDateValue,
        gpbnCode: gpbn!
      };
      const productPreview = generateProductStickerBlobUrl(productStickerData);
      setProductStickerPreviewUrl(productPreview);

    } catch (error) {
      console.error('Error generating sticker preview:', error);
    } finally {
      setIsGeneratingSticker(false);
    }
  };

  // Regenerate sticker preview with updated codes
  const regenerateStickerPreview = () => {
    if (!stickerProduct) return;

    // Clean up previous blob URL
    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl);
    }

    const stickerData: StickerData = {
      productName: stickerProduct.product_name,
      ingredients: stickerProduct.product_ingredient || 'No ingredients listed',
      bbdCode: editableBbdCode,
      pbnCode: editablePbnCode,
      barcode: editableBarcode
    };

    const previewUrl = generateStickerBlobUrl(stickerData);
    setStickerPreviewUrl(previewUrl);
  };

  // Regenerate Barcode Sticker preview
  const regenerateBarcodeStickerPreview = () => {
    if (!stickerProduct) return;

    if (barcodeStickerPreviewUrl) {
      URL.revokeObjectURL(barcodeStickerPreviewUrl);
    }

    const data: BarcodeStickerData = {
      productName: stickerProduct.product_name,
      barcode13: barcode13Digit
    };

    const previewUrl = generateBarcodeStickerBlobUrl(data);
    setBarcodeStickerPreviewUrl(previewUrl);
  };

  // Regenerate Product Sticker preview
  const regenerateProductStickerPreview = () => {
    if (!stickerProduct) return;

    if (productStickerPreviewUrl) {
      URL.revokeObjectURL(productStickerPreviewUrl);
    }

    const data: ProductStickerData = {
      productName: stickerProduct.product_name,
      ingredients: stickerProduct.product_ingredient || 'No ingredients listed',
      bbd: bbdDate,
      gpbnCode: gpbnCode
    };

    const previewUrl = generateProductStickerBlobUrl(data);
    setProductStickerPreviewUrl(previewUrl);
  };

  // Generate new barcode
  const handleGenerateNewBarcode = () => {
    const newBarcode = generate30DigitBarcode(editableBbdCode, editablePbnCode);
    setEditableBarcode(newBarcode);
  };

  // Save updated sticker codes
  const handleSaveStickerCodes = async () => {
    if (!stickerProduct) return;

    try {
      const updateData: Record<string, string | null> = {
        sticker_bbd_code: editableBbdCode,
        sticker_pbn_code: editablePbnCode,
        sticker_barcode: editableBarcode,
        barcode_13digit: barcode13Digit,
        sticker_gpbn_code: gpbnCode,
      };

      await supabase
        .from('product_list')
        .update(updateData)
        .eq('id', stickerProduct.id);

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === stickerProduct.id
          ? { ...p, ...updateData }
          : p
      ));

      setStickerProduct({ ...stickerProduct, ...updateData } as Product);
    } catch (error) {
      console.error('Error saving sticker codes:', error);
    }
  };

  // Handle sticker download
  const handleStickerDownload = () => {
    if (!stickerProduct) return;

    const stickerData: StickerData = {
      productName: stickerProduct.product_name,
      ingredients: stickerProduct.product_ingredient || 'No ingredients listed',
      bbdCode: editableBbdCode,
      pbnCode: editablePbnCode,
      barcode: editableBarcode
    };

    downloadStickerPDF(stickerData, `sticker-${stickerProduct.product_id}.pdf`);
  };

  // Handle Barcode Sticker download
  const handleBarcodeStickerDownload = () => {
    if (!stickerProduct) return;

    const data: BarcodeStickerData = {
      productName: stickerProduct.product_name,
      barcode13: barcode13Digit
    };

    downloadBarcodeStickerPDF(data, `barcode-sticker-${stickerProduct.product_id}.pdf`);
  };

  // Handle Product Sticker download
  const handleProductStickerDownload = () => {
    if (!stickerProduct) return;

    const data: ProductStickerData = {
      productName: stickerProduct.product_name,
      ingredients: stickerProduct.product_ingredient || 'No ingredients listed',
      bbd: bbdDate,
      gpbnCode: gpbnCode
    };

    downloadProductStickerPDF(data, `product-sticker-${stickerProduct.product_id}.pdf`);
  };
  const handleSwitchToEdit = () => {
    if (viewProduct) {
      setIsEditMode(true);
      setFormData({
        product_id: viewProduct.product_id,
        product_name: viewProduct.product_name,
        product_type: viewProduct.product_type,
        gelato_type: viewProduct.product_gelato_type,
        weight_kg: viewProduct.product_weight.toString(),
        milk_based_kg: viewProduct.product_milkbased?.toString() || "",
        sugar_syrup_based_kg: viewProduct.product_sugarbased?.toString() || "",
        shelf_life: viewProduct.product_shelflife ?? "",
        price_sgd: viewProduct.product_price.toString(),
        allergen: viewProduct.product_allergen || "",
        ingredient: viewProduct.product_ingredient || "",
        billing_name: viewProduct.product_billingName || "",
        description: viewProduct.product_description || "",
        cost: viewProduct.product_cost?.toString() || "",
      });
      if (viewProduct.product_image) {
        setPhotoPreview(
          `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${viewProduct.product_image}`
        );
      }
      setSelectedProduct(viewProduct);
      setIsViewModalOpen(false);
      setIsModalOpen(true);
    }
  };

  // Function to assign unique sequential barcodes to all products
  const assignBarcodesToProducts = async (products: Product[]) => {
    try {
      // Sort ALL products by id ascending for consistent sequential assignment
      const sortedProducts = [...products].sort((a, b) => a.id - b.id);

      // Find the highest existing codes across ALL products
      let highestBbdCode: string | null = null;
      let highestPbnCode: string | null = null;
      let highestBarcode13: string | null = null;
      let highestGpbnCode: string | null = null;

      for (const p of sortedProducts) {
        if (p.sticker_bbd_code) {
          const currentPrefix = parseInt(p.sticker_bbd_code.substring(0, 4) || '0', 10);
          const highestPrefix = parseInt(highestBbdCode?.substring(0, 4) || '0', 10);
          if (currentPrefix > highestPrefix) {
            highestBbdCode = p.sticker_bbd_code;
          }
        }
        if (p.sticker_pbn_code) {
          const currentNum = parseInt(p.sticker_pbn_code.replace('PBN', '') || '0', 10);
          const highestNum = parseInt(highestPbnCode?.replace('PBN', '') || '0', 10);
          if (currentNum > highestNum) {
            highestPbnCode = p.sticker_pbn_code;
          }
        }
        if (p.barcode_13digit) {
          const currentNum = parseInt(p.barcode_13digit || '0', 10);
          const highestNum = parseInt(highestBarcode13 || '0', 10);
          if (currentNum > highestNum) {
            highestBarcode13 = p.barcode_13digit;
          }
        }
        if (p.sticker_gpbn_code) {
          const currentNum = parseInt(p.sticker_gpbn_code.replace('GPBN', '') || '0', 10);
          const highestNum = parseInt(highestGpbnCode?.replace('GPBN', '') || '0', 10);
          if (currentNum > highestNum) {
            highestGpbnCode = p.sticker_gpbn_code;
          }
        }
      }

      // Track current codes for sequential assignment
      let currentBbdCode = highestBbdCode;
      let currentPbnCode = highestPbnCode;
      let currentBarcode13 = highestBarcode13;
      let currentGpbnCode = highestGpbnCode;

      // Assign barcodes to products that are missing ANY barcode field
      for (const product of sortedProducts) {
        const needsOldCodes = !product.sticker_bbd_code || !product.sticker_pbn_code || !product.sticker_barcode;
        const needsNewCodes = !product.barcode_13digit || !product.sticker_gpbn_code;

        if (needsOldCodes || needsNewCodes) {
          const updateData: Record<string, string | null> = {};

          // Generate old sticker codes if missing
          if (needsOldCodes) {
            currentBbdCode = generateNextBbdCode(currentBbdCode);
            currentPbnCode = generateNextPbnCode(currentPbnCode);
            const barcode = generate30DigitBarcode(currentBbdCode, currentPbnCode);

            updateData.sticker_bbd_code = currentBbdCode;
            updateData.sticker_pbn_code = currentPbnCode;
            updateData.sticker_barcode = barcode;

            // Update local product object
            product.sticker_bbd_code = currentBbdCode;
            product.sticker_pbn_code = currentPbnCode;
            product.sticker_barcode = barcode;
          }

          // Generate new sticker codes if missing
          if (needsNewCodes) {
            currentBarcode13 = generate13DigitBarcode(currentBarcode13);
            currentGpbnCode = generateNextGpbnCode(currentGpbnCode);

            updateData.barcode_13digit = currentBarcode13;
            updateData.sticker_gpbn_code = currentGpbnCode;

            // Update local product object
            product.barcode_13digit = currentBarcode13;
            product.sticker_gpbn_code = currentGpbnCode;
          }

          // Update database
          const { error: updateError } = await supabase
            .from('product_list')
            .update(updateData)
            .eq('id', product.id);

          if (updateError) {
            console.error(`Error updating barcodes for product ${product.id}:`, updateError);
          } else {
            console.log(`Assigned barcodes to product ${product.id} (${product.product_name}):`, updateData);
          }
        }
      }
    } catch (error) {
      console.error('Error assigning barcodes to products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch products, filtering out soft-deleted ones
      // Use .neq or .is to filter - try both approaches for compatibility
      let data, error;

      // Try fetching with is_deleted filter first
      const result1 = await supabase
        .from("product_list")
        .select("*")
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("id", { ascending: false });

      if (result1.error && result1.error.message?.includes("is_deleted")) {
        // is_deleted column doesn't exist, fetch all
        const result2 = await supabase
          .from("product_list")
          .select("*")
          .order("id", { ascending: false });
        data = result2.data;
        error = result2.error;
      } else {
        data = result1.data;
        error = result1.error;
      }

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      const products = data || [];

      // Auto-assign ALL barcode fields to products that are missing any of them
      // This ensures every product has a complete set of unique sequential barcodes
      await assignBarcodesToProducts(products);

      setProducts(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      setMessage({ type: "error", text: "Failed to load products" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // COMPLETELY IGNORE custom dropdowns - let them handle themselves
      if (target.closest(".custom-dropdown-container")) {
        return;
      }

      if (
        !target.closest(".sort-dropdown") &&
        !target.closest(".filter-dropdown")
      ) {
        setIsSortDropdownOpen(false);
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddProductType = async () => {
    if (
      newProductType.trim() &&
      !productTypeOptions.includes(newProductType.trim())
    ) {
      const trimmedValue = newProductType.trim();

      // Update state FIRST to prevent re-render issues
      setProductTypeOptions((prev) => [...prev, trimmedValue]);
      setFormData((prev) => ({ ...prev, product_type: trimmedValue }));
      setNewProductType("");

      // Then save to database in background
      try {
        await supabase.from("dropdown_options").insert({
          option_type: "product_type",
          option_value: trimmedValue,
        });
      } catch (error) {
        console.error("Error adding product type:", error);
      }
    }
  };

  const handleRemoveProductType = async (option: string) => {
    try {
      const { error } = await supabase
        .from("dropdown_options")
        .delete()
        .eq("option_type", "product_type")
        .eq("option_value", option);

      if (!error) {
        setProductTypeOptions(
          productTypeOptions.filter((opt) => opt !== option)
        );
      }
    } catch (error) {
      console.error("Error removing product type:", error);
    }
  };

  const handleAddGelatoType = async () => {
    if (
      newGelatoType.trim() &&
      !gelatoTypeOptions.includes(newGelatoType.trim())
    ) {
      const trimmedValue = newGelatoType.trim();

      // Update state FIRST to prevent re-render issues
      setGelatoTypeOptions((prev) => [...prev, trimmedValue]);
      setFormData((prev) => ({ ...prev, gelato_type: trimmedValue }));
      setNewGelatoType("");

      // Then save to database in background
      try {
        await supabase.from("dropdown_options").insert({
          option_type: "gelato_type",
          option_value: trimmedValue,
        });
      } catch (error) {
        console.error("Error adding gelato type:", error);
      }
    }
  };

  const handleRemoveGelatoType = async (option: string) => {
    try {
      const { error } = await supabase
        .from("dropdown_options")
        .delete()
        .eq("option_type", "gelato_type")
        .eq("option_value", option);

      if (!error) {
        setGelatoTypeOptions(gelatoTypeOptions.filter((opt) => opt !== option));
      }
    } catch (error) {
      console.error("Error removing gelato type:", error);
    }
  };

  interface CustomDropdownProps {
    label: string;
    name: string;
    value: string;
    options: string[];
    onChange: (e: { target: { name: string; value: string } }) => void;
    onAddOption: () => void;
    onRemoveOption: (option: string) => void;
    required?: boolean;
  }

  const CustomDropdown = ({
    label,
    name,
    value,
    options,
    onChange,
    onAddOption,
    onRemoveOption,
    required = false,
  }: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div ref={dropdownRef} className="relative">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm cursor-pointer bg-white flex justify-between items-center text-left"
        >
          <span className={value ? "text-gray-900" : "text-gray-500"}>
            {value || `Select ${label}`}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="py-1">
              {options.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No options yet. Click &quot;Add Option&quot; to create one.
                </div>
              )}

              {options.map((option) => (
                <div
                  key={option}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                  onClick={() => {
                    onChange({ target: { name, value: option } });
                    setIsOpen(false);
                  }}
                >
                  <span
                    className={
                      value === option ? "text-orange-600 font-medium" : ""
                    }
                  >
                    {option}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOption(option);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddOption();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-orange-50 cursor-pointer flex items-center gap-2 text-orange-600 border-t border-gray-200"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Add New Option</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const generateProductId = async (): Promise<string> => {
    try {
      // Get the highest existing product ID number
      const { data: existingProducts, error: fetchError } = await supabase
        .from("product_list")
        .select("product_id")
        .like("product_id", "GEL-%")
        .order("product_id", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("Error fetching existing products:", fetchError);
      }

      let nextNumber = 1;

      if (existingProducts && existingProducts.length > 0) {
        const lastId = existingProducts[0].product_id;
        const lastNumber = parseInt(lastId.replace("GEL-", ""));
        nextNumber = lastNumber + 1;
      }

      // Format with leading zeros (GEL-00001, GEL-00002, etc.)
      const newId = `GEL-${String(nextNumber).padStart(5, "0")}`;

      return newId;
    } catch (error) {
      console.error("Error generating product ID:", error);
      return `GEL-${String(Math.floor(Math.random() * 99999) + 1).padStart(
        5,
        "0"
      )}`;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(currentProducts.map((product) => product.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedRows(newSelected);
  };

  const handleEdit = () => {
    const productId = Array.from(selectedRows)[0];
    const product = products.find((p) => p.id === productId);
    if (product) {
      setIsEditMode(true);
      setFormData({
        product_id: product.product_id,
        product_name: product.product_name,
        product_type: product.product_type,
        gelato_type: product.product_gelato_type,
        weight_kg: product.product_weight.toString(),
        milk_based_kg: product.product_milkbased?.toString() || "",
        sugar_syrup_based_kg: product.product_sugarbased?.toString() || "",
        shelf_life: product.product_shelflife ?? "",
        price_sgd: product.product_price.toString(),
        allergen: product.product_allergen || "",
        ingredient: product.product_ingredient || "",
        billing_name: product.product_billingName || "",
        description: product.product_description || "",
        cost: product.product_cost?.toString() || "",
      });
      if (product.product_image) {
        setPhotoPreview(
          `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${product.product_image}`
        );
      }
      setSelectedProduct(product);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const idsToDelete = Array.from(selectedRows);

      // Get products to delete for image cleanup
      const productsToDelete = products.filter((p) =>
        idsToDelete.includes(p.id)
      );

      // Step 1: Remove from client_product (assigned products)
      await supabase
        .from("client_product")
        .delete()
        .in("product_id", idsToDelete);

      // Step 2: Remove from client_basket
      await supabase
        .from("client_basket")
        .delete()
        .in("product_id", idsToDelete);

      // Step 3: Soft delete - mark products as deleted instead of hard delete
      // This preserves order history and references
      const { error } = await supabase
        .from("product_list")
        .update({ is_deleted: true })
        .in("id", idsToDelete);

      if (error) {
        const errorMsg = error.message || "";

        // If is_deleted column doesn't exist, show helpful message
        if (errorMsg.includes("is_deleted") || errorMsg.includes("column")) {
          throw new Error(
            "Please run the database migration first. Go to Supabase SQL Editor and run:\n\n" +
            "ALTER TABLE product_list ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;"
          );
        }
        throw new Error(errorMsg || "Failed to delete product(s)");
      }

      // Delete product images after successful soft delete
      const imagesToDelete = productsToDelete
        .filter((p) => p.product_image)
        .map((p) => p.product_image as string);

      if (imagesToDelete.length > 0) {
        await supabase.storage.from("gwc_files").remove(imagesToDelete);
      }

      // Refresh products list
      await fetchProducts();

      setSelectedRows(new Set());
      setIsDeleteConfirmOpen(false);
      setIsDeleteSuccessOpen(true);
    } catch (error) {
      console.error("Error deleting products:", error);
      const errorMessage = error instanceof Error ? error.message : String(error) || "Unknown error";
      setMessage({
        type: "error",
        text: errorMessage,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 10000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;

    // Validate required fields
    if (
      !formData.product_name ||
      !formData.product_type ||
      !formData.gelato_type ||
      !formData.weight_kg ||
      !formData.shelf_life ||
      !formData.price_sgd
    ) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    // Validate numeric fields
    if (isNaN(Number(formData.weight_kg)) || Number(formData.weight_kg) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid weight" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    if (isNaN(Number(formData.price_sgd)) || Number(formData.price_sgd) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid price" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    // Validate cost if provided
    if (
      formData.cost &&
      (isNaN(Number(formData.cost)) || Number(formData.cost) < 0)
    ) {
      setMessage({ type: "error", text: "Please enter a valid cost" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      let photoPath = selectedProduct.product_image;

      // Upload new product photo if changed
      if (productPhoto) {
        // Delete old photo if exists
        if (selectedProduct.product_image) {
          await supabase.storage
            .from("gwc_files")
            .remove([selectedProduct.product_image]);
        }

        const fileExt =
          productPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `product_photo/${selectedProduct.product_id}_${timestamp}_${randomStr}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gwc_files")
          .upload(fileName, productPhoto, {
            cacheControl: "3600",
            upsert: false,
            contentType: productPhoto.type,
          });

        if (uploadError) throw new Error("Failed to upload product photo");
        photoPath = fileName;
      }

      // Update product in database with modified_at timestamp
      const { error: updateError } = await supabase
        .from("product_list")
        .update({
          product_name: formData.product_name,
          product_type: formData.product_type,
          product_gelato_type: formData.gelato_type,
          product_weight: Number(formData.weight_kg),
          product_milkbased: formData.milk_based_kg
            ? Number(formData.milk_based_kg)
            : null,
          product_sugarbased: formData.sugar_syrup_based_kg
            ? Number(formData.sugar_syrup_based_kg)
            : null,
          product_shelflife: formData.shelf_life,
          product_price: Number(formData.price_sgd),
          product_allergen: formData.allergen || null,
          product_ingredient: formData.ingredient || null,
          product_image: photoPath,
          product_billingName: formData.billing_name || null,
          product_description: formData.description || null,
          product_cost: formData.cost ? Number(formData.cost) : null,
          product_modified_at: new Date().toISOString(),
        })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // Refresh products list
      await fetchProducts();

      // Close modal and show success
      setIsModalOpen(false);
      setIsEditSuccessOpen(true);
      setIsEditMode(false);
      setSelectedRows(new Set());

      // Reset form
      setFormData({
        product_id: "",
        product_name: "",
        product_type: "",
        gelato_type: "",
        weight_kg: "",
        milk_based_kg: "",
        sugar_syrup_based_kg: "",
        shelf_life: "",
        price_sgd: "",
        allergen: "",
        ingredient: "",
        billing_name: "",
        description: "",
        cost: "",
      });
      setProductPhoto(null);
      setPhotoPreview("");
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update product. Please try again.",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "File size must be less than 10MB" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setMessage({
          type: "error",
          text: "Please upload a valid image (JPG, PNG, WEBP)",
        });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        return;
      }

      setProductPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (
      !formData.product_name ||
      !formData.product_type ||
      !formData.gelato_type ||
      !formData.weight_kg ||
      !formData.shelf_life ||
      !formData.price_sgd
    ) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    // Validate numeric fields
    if (isNaN(Number(formData.weight_kg)) || Number(formData.weight_kg) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid weight" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    if (isNaN(Number(formData.price_sgd)) || Number(formData.price_sgd) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid price" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    if (
      formData.milk_based_kg &&
      (isNaN(Number(formData.milk_based_kg)) ||
        Number(formData.milk_based_kg) < 0)
    ) {
      setMessage({
        type: "error",
        text: "Please enter a valid milk-based weight",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    if (
      formData.sugar_syrup_based_kg &&
      (isNaN(Number(formData.sugar_syrup_based_kg)) ||
        Number(formData.sugar_syrup_based_kg) < 0)
    ) {
      setMessage({
        type: "error",
        text: "Please enter a valid sugar syrup-based weight",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    // Validate cost if provided
    if (
      formData.cost &&
      (isNaN(Number(formData.cost)) || Number(formData.cost) < 0)
    ) {
      setMessage({ type: "error", text: "Please enter a valid cost" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      // Generate new product ID
      const productId = await generateProductId();

      let photoPath = null;

      if (isDuplicating && duplicateSourceProduct?.product_image && !productPhoto) {
        try {
          // Download the original image
          const { data: originalImageData } = await supabase.storage
            .from('gwc_files')
            .download(duplicateSourceProduct.product_image);
          
          if (originalImageData) {
            // Generate new filename for the duplicate
            const fileExt = duplicateSourceProduct.product_image.split('.').pop()?.toLowerCase() || 'jpg';
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const fileName = `product_photo/${productId}_${timestamp}_${randomStr}.${fileExt}`;
            
            // Upload as new file
            const { error: uploadError } = await supabase.storage
              .from('gwc_files')
              .upload(fileName, originalImageData, {
                cacheControl: '3600',
                upsert: false,
              });
            
            if (!uploadError) {
              photoPath = fileName;
            }
          }
        } catch (error) {
          console.error('Error duplicating image:', error);
          // Continue without image if duplication fails
        }
      }

      // Upload product photo if exists
      if (productPhoto) {
        const fileExt =
          productPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `product_photo/${productId}_${timestamp}_${randomStr}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("gwc_files")
          .upload(fileName, productPhoto, {
            cacheControl: "3600",
            upsert: false,
            contentType: productPhoto.type,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(
            "Failed to upload product photo: " + uploadError.message
          );
        }

        if (!uploadData?.path) {
          throw new Error("Upload succeeded but no file path was returned");
        }

        photoPath = fileName;
      }

      // Generate sticker codes for the new product
      const { data: lastProduct } = await supabase
        .from('product_list')
        .select('sticker_bbd_code, sticker_pbn_code, barcode_13digit, sticker_gpbn_code')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      // Find the highest codes to ensure uniqueness
      const { data: allProducts } = await supabase
        .from('product_list')
        .select('sticker_bbd_code, sticker_pbn_code, barcode_13digit, sticker_gpbn_code')
        .order('id', { ascending: false });

      // Find highest BBD code
      let highestBbdCode: string | null = null;
      let highestPbnCode: string | null = null;
      let highestBarcode13: string | null = null;
      let highestGpbnCode: string | null = null;

      if (allProducts) {
        for (const p of allProducts) {
          if (p.sticker_bbd_code) {
            const currentPrefix = parseInt(p.sticker_bbd_code.substring(0, 4) || '0', 10);
            const highestPrefix = parseInt(highestBbdCode?.substring(0, 4) || '0', 10);
            if (currentPrefix > highestPrefix) {
              highestBbdCode = p.sticker_bbd_code;
            }
          }
          if (p.sticker_pbn_code) {
            const currentNum = parseInt(p.sticker_pbn_code.replace('PBN', '') || '0', 10);
            const highestNum = parseInt(highestPbnCode?.replace('PBN', '') || '0', 10);
            if (currentNum > highestNum) {
              highestPbnCode = p.sticker_pbn_code;
            }
          }
          if (p.barcode_13digit) {
            const currentNum = parseInt(p.barcode_13digit || '0', 10);
            const highestNum = parseInt(highestBarcode13 || '0', 10);
            if (currentNum > highestNum) {
              highestBarcode13 = p.barcode_13digit;
            }
          }
          if (p.sticker_gpbn_code) {
            const currentNum = parseInt(p.sticker_gpbn_code.replace('GPBN', '') || '0', 10);
            const highestNum = parseInt(highestGpbnCode?.replace('GPBN', '') || '0', 10);
            if (currentNum > highestNum) {
              highestGpbnCode = p.sticker_gpbn_code;
            }
          }
        }
      }

      const newBbdCode = generateNextBbdCode(highestBbdCode);
      const newPbnCode = generateNextPbnCode(highestPbnCode);
      const newBarcode = generate30DigitBarcode(newBbdCode, newPbnCode);
      const newBarcode13 = generate13DigitBarcode(highestBarcode13);
      const newGpbnCode = generateNextGpbnCode(highestGpbnCode);

      // Insert product into database with all sticker fields
      const { data: insertData, error: insertError } = await supabase
        .from("product_list")
        .insert({
          product_id: productId,
          product_name: formData.product_name,
          product_type: formData.product_type,
          product_gelato_type: formData.gelato_type,
          product_weight: Number(formData.weight_kg),
          product_milkbased: formData.milk_based_kg
            ? Number(formData.milk_based_kg)
            : null,
          product_sugarbased: formData.sugar_syrup_based_kg
            ? Number(formData.sugar_syrup_based_kg)
            : null,
          product_shelflife: formData.shelf_life,
          product_price: Number(formData.price_sgd),
          product_allergen: formData.allergen || null,
          product_ingredient: formData.ingredient || null,
          product_image: photoPath,
          product_billingName: formData.billing_name || null,
          product_description: formData.description || null,
          product_cost: formData.cost ? Number(formData.cost) : null,
          product_created_at: new Date().toISOString(),
          sticker_bbd_code: newBbdCode,
          sticker_pbn_code: newPbnCode,
          sticker_barcode: newBarcode,
          barcode_13digit: newBarcode13,
          sticker_gpbn_code: newGpbnCode,
        })
        .select();

      if (insertError) {
        console.error("Database insert error:", insertError);
        // Rollback - delete uploaded photo
        if (photoPath) {
          await supabase.storage.from("gwc_files").remove([photoPath]);
        }
        throw new Error("Failed to save product data: " + insertError.message);
      }

      console.log("Insert successful:", insertData);

      // Add product to selected clients if any
      if (selectedClients.size > 0 && insertData && insertData[0]) {
        const productListId = insertData[0].id;
        const clientProductInserts = Array.from(selectedClients).map(clientAuthId => ({
          client_auth_id: clientAuthId,
          product_id: productListId,
          custom_price: Number(formData.price_sgd), // Use product price as default
          is_available: true,
          is_published: false, // NOT PUBLISHED - needs customization
          created_at: new Date().toISOString()
        }));

        const { error: clientProductError } = await supabase
          .from('client_product')
          .insert(clientProductInserts);

        if (clientProductError) {
          console.error('Error adding product to clients:', clientProductError);
          // Don't fail the whole operation, just log the error
        }
      }
      // Refresh products list
      await fetchProducts();

      // Close modal and show success
      setIsModalOpen(false);
      setIsSuccessModalOpen(true);
      setSelectedRows(new Set());

      // Reset form
      setFormData({
        product_id: "",
        product_name: "",
        product_type: "",
        gelato_type: "",
        weight_kg: "",
        milk_based_kg: "",
        sugar_syrup_based_kg: "",
        shelf_life: "",
        price_sgd: "",
        allergen: "",
        ingredient: "",
        billing_name: "",
        description: "",
        cost: "",
      });
      setProductPhoto(null);
      setPhotoPreview('');
      setSelectedClients(new Set());
      setClientSearchQuery('');

      setMessage({ type: 'success', text: 'Product added successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to add product. Please try again.',
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

 // Call fetchClients when modal opens
  const openModal = async () => {
    const newId = await generateProductId();
    setFormData((prev) => ({ ...prev, product_id: newId }));
    await fetchClients(); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedProduct(null);
    setProductPhoto(null);
    setIsDuplicating(false); 
    setDuplicateSourceProduct(null);
    setPhotoPreview('');
    setMessage({ type: '', text: '' });
    setSelectedClients(new Set());
    setClientSearchQuery('');
    setFormData({
      product_id: '',
      product_name: '',
      product_type: '',
      gelato_type: '',
      weight_kg: '',
      milk_based_kg: '',
      sugar_syrup_based_kg: '',
      shelf_life: '',
      price_sgd: '',
      allergen: '',
      ingredient: '',
      billing_name: '',
      description: '',
      cost: '',
    });
  };

  const closeSuccessModal = () => {
    setIsSuccessModalOpen(false);
  };

  const filteredProducts = products
    .filter((product) => {
      // Search filter
      const matchesSearch =
        product.product_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.product_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        product.product_type
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        product.product_gelato_type
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // If "all" filter, show everything
      if (filterBy === "all") return true;

      // Helper function to convert string to slug format for comparison
      const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, "-");

      // Check if filterBy matches a product type
      const matchedProductType = productTypeOptions.find(
        (type) => toSlug(type) === filterBy
      );
      if (matchedProductType) {
        return product.product_type === matchedProductType;
      }

      // Check if filterBy matches a gelato type
      const matchedGelatoType = gelatoTypeOptions.find(
        (type) => toSlug(type) === filterBy
      );
      if (matchedGelatoType) {
        return product.product_gelato_type === matchedGelatoType;
      }

      return true; // Default: show all
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.product_created_at).getTime() -
            new Date(a.product_created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.product_created_at).getTime() -
            new Date(b.product_created_at).getTime()
          );
        case "name-asc":
          return a.product_name.localeCompare(b.product_name);
        case "name-desc":
          return b.product_name.localeCompare(a.product_name);
        case "price-asc":
          return a.product_price - b.product_price;
        case "price-desc":
          return b.product_price - a.product_price;
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: '"Roboto Condensed", sans-serif' }}
    >
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: "#FCF0E3" }}>
          {/* Message Display */}
          {message.text && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 20px",
                borderRadius: "8px",
                backgroundColor:
                  message.type === "success" ? "#d4edda" : "#f8d7da",
                color: message.type === "success" ? "#155724" : "#721c24",
                border: `1px solid ${
                  message.type === "success" ? "#c3e6cb" : "#f5c6cb"
                }`,
              }}
            >
              {message.text}
            </div>
          )}

          {/* Action Toast for Selected Rows */}
          {selectedRows.size > 0 && (
            <div
              style={{
                position: "fixed",
                bottom: "30px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#4A5568",
                color: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                zIndex: 9999,
                minWidth: "auto",
              }}
            >
              <button
                onClick={() => setSelectedRows(new Set())}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Close"
                style={{ padding: "2px" }}
              >
                <X size={16} />
              </button>

              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              ></div>

              <span className="text-sm" style={{ minWidth: "100px" }}>
                {selectedRows.size} item{selectedRows.size === 1 ? "" : "s"}{" "}
                selected
              </span>

              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              ></div>

              {selectedRows.size === 1 && (
                <>
                  <button
                    onClick={handleEdit}
                    disabled={loading || !canEditProducts}
                    className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: "2px 6px" }}
                    title={!canEditProducts ? "You do not have permission to edit products" : ""}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span className="text-sm">Edit</span>
                  </button>

                  <div
                    style={{
                      width: "1px",
                      height: "20px",
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                    }}
                  ></div>
                </>
              )}

              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={loading || !canEditProducts}
                className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "2px 6px" }}
                title={!canEditProducts ? "You do not have permission to delete products" : ""}
              >
                <X size={16} />
                <span className="text-sm">Remove</span>
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: "#5C2E1F" }}>
                Product List
              </h1>

              <div className="flex items-center gap-4">
                {/* Search Bar */}
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

                {/* Sort By Button */}
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
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSortBy("newest");
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            sortBy === "newest"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("oldest");
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            sortBy === "oldest"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          Oldest First
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("name-asc");
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            sortBy === "name-asc"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          Name (A-Z)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("name-desc");
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            sortBy === "name-desc"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          Name (Z-A)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("price-asc");
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            sortBy === "price-asc"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          Price (Low to High)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("price-desc");
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            sortBy === "price-desc"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          Price (High to Low)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Button */}
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
                            setFilterBy("all");
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            filterBy === "all"
                              ? "bg-orange-50 text-orange-600"
                              : ""
                          }`}
                        >
                          All Products
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <div className="px-4 py-2 text-xs text-gray-500 font-medium">
                          Product Type
                        </div>
                        {productTypeOptions.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setFilterBy(
                                type.toLowerCase().replace(/\s+/g, "-") as
                                  | "all"
                                  | "gelato"
                                  | "sorbet"
                                  | "ice-cream"
                                  | "milk-based"
                                  | "sugar-based"
                                  | "mixed"
                              );
                              setIsFilterDropdownOpen(false);
                              setCurrentPage(1);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                              filterBy ===
                              type.toLowerCase().replace(/\s+/g, "-")
                                ? "bg-orange-50 text-orange-600"
                                : ""
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                        <div className="border-t border-gray-200 my-1"></div>
                        <div className="px-4 py-2 text-xs text-gray-500 font-medium">
                          Gelato Type
                        </div>
                        {gelatoTypeOptions.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setFilterBy(
                                type.toLowerCase().replace(/\s+/g, "-")
                              );
                              setIsFilterDropdownOpen(false);
                              setCurrentPage(1);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                              filterBy ===
                              type.toLowerCase().replace(/\s+/g, "-")
                                ? "bg-orange-50 text-orange-600"
                                : ""
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add New Product Button */}
                <button
                  onClick={openModal}
                  disabled={loading || !canEditProducts}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: canEditProducts ? "#FF5722" : "#ccc",
                    cursor: canEditProducts ? "pointer" : "not-allowed"
                  }}
                  title={!canEditProducts ? "You do not have permission to add products" : ""}
                >
                  <Plus size={20} />
                  <span>Add New Product</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: "#5C2E1F" }}>
                    <th className="text-left py-2 px-3">
                      <input
                        type="checkbox"
                        className={`w-4 h-4 ${canEditProducts ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        checked={
                          selectedRows.size === currentProducts.length &&
                          currentProducts.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        disabled={!canEditProducts}
                      />
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      NAME
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      BILLING NAME
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      TYPE
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      GELATO TYPE
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      WEIGHT (kg)
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      SHELF LIFE
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      PRICE (S$)
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      COST (S$)
                    </th>
                    <th
                      className="text-left py-2 px-3 font-bold text-xs"
                      style={{ color: "#5C2E1F" }}
                    >
                      STICKER
                    </th>
                    <th
                      className="text-left py-1 px-3 font-bold text-xs w-1"
                      style={{ color: "#5C2E1F", width: "2px", minWidth: "2px", maxWidth: "2px", whiteSpace: "nowrap", }}
                    >

                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-0">
                        <SkeletonStyles />
                        <ProductListSkeleton rows={8} />
                      </td>
                    </tr>
                  ) : currentProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-8 text-gray-500"
                      >
                        {searchQuery
                          ? "No products found matching your search."
                          : 'No products found. Click "Add New Product" to get started.'}
                      </td>
                    </tr>
                  ) : (
                    currentProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={(e) => {
                          // Don't trigger row click if clicking checkbox
                          const target = e.target as HTMLElement;
                          if (target.tagName !== "INPUT") {
                            handleRowClick(product);
                          }
                        }}
                      >
                        <td
                          className="py-2 px-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className={`w-4 h-4 ${canEditProducts ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            checked={selectedRows.has(product.id)}
                            onChange={(e) =>
                              handleSelectRow(product.id, e.target.checked)
                            }
                            disabled={!canEditProducts}
                          />
                        </td>
                        <td className="py-2 px-3 text-xs">
                          <div className="flex items-center gap-2">
                            {product.product_image ? (
                              <div className="w-8 h-8 min-w-[32px] min-h-[32px] flex-shrink-0">
                                <Image
                                  src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${product.product_image}`}
                                  alt={product.product_name}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover rounded"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 min-w-[32px] min-h-[32px] flex-shrink-0 bg-gray-200 rounded flex items-center justify-center">
                                <ImageIcon
                                  size={16}
                                  className="text-gray-400"
                                />
                              </div>
                            )}
                            <span className="truncate">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_billingName || '-'}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_type}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_gelato_type}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_weight}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_shelflife}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_price}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {product.product_cost || '-'}
                        </td>
                        <td
                          className="py-2 px-3 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleStickerPreview(product)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            title="View Sticker"
                          >
                            <Tag size={12} />
                            Sticker
                          </button>
                        </td>
                        <td
                          className="py-1 px-1 text-xs relative"  style={{ width: "2px", minWidth: "2px", maxWidth: "2px", whiteSpace: "nowrap", }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="actions-dropdown">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === product.id ? null : product.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                            
                            {activeDropdown === product.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(product);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                  >
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                  Duplicate
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredProducts.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "#5C2E1F" }}
                >
                  Previous
                </button>

                <span className="text-sm" style={{ color: "#5C2E1F" }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "#5C2E1F" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add New Product Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: "#5C2E1F" }}>
                    {isEditMode ? "Edit Product" : isDuplicating ? "Duplicate Product" : "Add New Product"}
                  </h2>
                <button
                  onClick={closeModal}
                  disabled={loading}
                  className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Message Display in Modal */}
              {message.text && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    backgroundColor:
                      message.type === "success" ? "#d4edda" : "#f8d7da",
                    color: message.type === "success" ? "#155724" : "#721c24",
                    fontSize: "14px",
                    border: `1px solid ${
                      message.type === "success" ? "#c3e6cb" : "#f5c6cb"
                    }`,
                  }}
                >
                  {message.text}
                </div>
              )}

              <div className="space-y-6">
                {/* Product Photo Upload */}
                <div className="flex justify-center">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center w-48 h-48 flex items-center justify-center bg-gray-50">
                    <input
                      type="file"
                      id="photo-upload"
                      onChange={handlePhotoChange}
                      className="hidden"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer flex flex-col items-center w-full h-full justify-center"
                    >
                      {photoPreview ? (
                        <Image
                          src={photoPreview}
                          alt="Preview"
                          width={176}
                          height={176}
                          className="w-full h-full object-cover rounded"
                          unoptimized
                        />
                      ) : (
                        <>
                          <ImageIcon className="text-gray-400 mb-2" size={40} />
                          <span className="text-gray-500 text-sm">
                            Upload product photo
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product ID
                    </label>
                    <input
                      type="text"
                      name="product_id"
                      value={formData.product_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product Billing Name{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="billing_name"
                      value={formData.billing_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <CustomDropdown
                      label="Type"
                      name="product_type"
                      value={formData.product_type}
                      options={productTypeOptions}
                      onChange={handleInputChange}
                      onAddOption={() => {
                        setAddOptionType("product_type");
                        setAddOptionLabel("Type");
                        setIsAddOptionModalOpen(true);
                      }}
                      onRemoveOption={handleRemoveProductType}
                      required={true}
                    />
                  </div>
                  <div>
                    <CustomDropdown
                      label="Gelato Type"
                      name="gelato_type"
                      value={formData.gelato_type}
                      options={gelatoTypeOptions}
                      onChange={handleInputChange}
                      onAddOption={() => {
                        setAddOptionType("gelato_type");
                        setAddOptionLabel("Gelato Type");
                        setIsAddOptionModalOpen(true);
                      }}
                      onRemoveOption={handleRemoveGelatoType}
                      required={true}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="weight_kg"
                      value={formData.weight_kg}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Milk-based (kg){" "}
                      <span className="text-gray-400 font-normal">
                        optional
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="milk_based_kg"
                      value={formData.milk_based_kg}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Sugar Syrup-based (kg){" "}
                      <span className="text-gray-400 font-normal">
                        optional
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="sugar_syrup_based_kg"
                      value={formData.sugar_syrup_based_kg}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Shelf Life (No. of Months){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="shelf_life"
                      value={formData.shelf_life}
                      onChange={handleInputChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Price (S$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="price_sgd"
                      value={formData.price_sgd}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Cost (S$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="cost"
                      value={formData.cost}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                </div>

                {/* OTHERS Section */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-700">
                    OTHERS
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Memo/Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        placeholder="Enter product memo or description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Allergen <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="allergen"
                        value={formData.allergen}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        placeholder="Enter product label allergen information"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Ingredient <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="ingredient"
                        value={formData.ingredient}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        placeholder="Enter product label ingredient information"
                      />
                    </div>
                  </div>
                </div>
                {/* Client Assignment Section - Only show when NOT in edit mode */}
                {!isEditMode && (
                  <div>
                    <h3 className="text-base font-semibold mb-3 text-gray-700">
                      ASSIGN TO CLIENTS (Optional)
                    </h3>
                    <div className="border border-gray-300 rounded-lg p-4">
                      {/* Client Search */}
                      <div className="mb-3">
                        <div className="relative">
                          <Search 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                            size={16} 
                          />
                          <input
                            type="text"
                            placeholder="Search clients..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Clients List */}
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                        {availableClients.length === 0 ? (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            No clients available
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {availableClients
                              .filter(client => 
                                client.client_businessName.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                client.client_person_incharge.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                client.client_id.toLowerCase().includes(clientSearchQuery.toLowerCase())
                              )
                              .map((client) => (
                                <div key={client.client_auth_id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                                  <input
                                    type="checkbox"
                                    checked={selectedClients.has(client.client_auth_id)}
                                    onChange={(e) => handleClientSelection(client.client_auth_id, e.target.checked)}
                                    className={`w-4 h-4 ${canEditProducts ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                    disabled={!canEditProducts}
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{client.client_businessName}</p>
                                    <p className="text-xs text-gray-500">{client.client_id} • {client.client_person_incharge}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Selected Count */}
                      <div className="mt-3 text-sm text-gray-600">
                        {selectedClients.size} client{selectedClients.size !== 1 ? 's' : ''} selected
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-6">
                  <button
                    onClick={isEditMode ? handleUpdate : handleSubmit}
                    disabled={loading}
                    className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#FF5722" }}
                  >
                    {loading
                      ? isEditMode
                        ? "Updating Product..."
                        : "Adding Product..."
                      : isEditMode
                      ? "Update Product"
                      : "Add Product"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddOptionModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "#5C2E1F" }}>
                Add New {addOptionLabel}
              </h3>
              <button
                onClick={() => {
                  setIsAddOptionModalOpen(false);
                  setAddOptionType(null);
                  if (addOptionType === "product_type") setNewProductType("");
                  if (addOptionType === "gelato_type") setNewGelatoType("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Option Name
              </label>
              <input
                type="text"
                value={
                  addOptionType === "product_type"
                    ? newProductType
                    : newGelatoType
                }
                onChange={(e) => {
                  if (addOptionType === "product_type")
                    setNewProductType(e.target.value);
                  if (addOptionType === "gelato_type")
                    setNewGelatoType(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (
                      addOptionType === "product_type" &&
                      newProductType.trim()
                    ) {
                      handleAddProductType();
                      setIsAddOptionModalOpen(false);
                    }
                    if (
                      addOptionType === "gelato_type" &&
                      newGelatoType.trim()
                    ) {
                      handleAddGelatoType();
                      setIsAddOptionModalOpen(false);
                    }
                  }
                }}
                placeholder='Enter Type Options'
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsAddOptionModalOpen(false);
                  setAddOptionType(null);
                  if (addOptionType === "product_type") setNewProductType("");
                  if (addOptionType === "gelato_type") setNewGelatoType("");
                }}
                className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (
                    addOptionType === "product_type" &&
                    newProductType.trim()
                  ) {
                    handleAddProductType();
                    setIsAddOptionModalOpen(false);
                  }
                  if (addOptionType === "gelato_type" && newGelatoType.trim()) {
                    handleAddGelatoType();
                    setIsAddOptionModalOpen(false);
                  }
                }}
                disabled={
                  (addOptionType === "product_type" &&
                    !newProductType.trim()) ||
                  (addOptionType === "gelato_type" && !newGelatoType.trim())
                }
                className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {isViewModalOpen && viewProduct && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: "#5C2E1F" }}>
                  View Product Details
                </h2>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewProduct(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Product Photo Display */}
                <div className="flex justify-center">
                  <div className="border-2 border-gray-300 rounded-lg p-8 w-48 h-48 flex items-center justify-center bg-gray-50">
                    {viewProduct.product_image ? (
                      <Image
                        src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${viewProduct.product_image}`}
                        alt={viewProduct.product_name}
                        width={176}
                        height={176}
                        className="w-full h-full object-cover rounded"
                        unoptimized
                      />
                    ) : (
                      <>
                        <ImageIcon className="text-gray-400 mb-2" size={40} />
                        <span className="text-gray-500 text-sm">
                          No product photo
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Form Fields - Read Only */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product ID
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_name}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Product Billing Name
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_billingName || "-"}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Type
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_type}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Gelato Type
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_gelato_type}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_weight}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Milk-based (kg)
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_milkbased || "-"}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Sugar Syrup-based (kg)
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_sugarbased || "-"}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Shelf Life (No. of Months)
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_shelflife}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Price (S$)
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_price}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Cost (S$)
                    </label>
                    <input
                      type="text"
                      value={viewProduct.product_cost || "-"}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      disabled
                    />
                  </div>
                </div>

                {/* OTHERS Section */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-700">
                    OTHERS
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Memo/Description
                      </label>
                      <textarea
                        value={viewProduct.product_description || "-"}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Allergen
                      </label>
                      <textarea
                        value={viewProduct.product_allergen || "-"}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Ingredient
                      </label>
                      <textarea
                        value={viewProduct.product_ingredient || "-"}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleSwitchToEdit}
                    className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#FF5722" }}
                  >
                    Edit Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <X size={32} className="text-red-600" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "#5C2E1F" }}
            >
              Confirm Product Removal
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove {selectedRows.size}{" "}
              {selectedRows.size === 1 ? "product" : "products"}? This action
              cannot be undone.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-8 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {isDeleteSuccessOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <button
              onClick={() => setIsDeleteSuccessOpen(false)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "#5C2E1F" }}
            >
              Successfully Removed!
            </h2>
            <p className="text-gray-600 mb-6">
              Product(s) have been removed from the system.
            </p>
            <button
              onClick={() => setIsDeleteSuccessOpen(false)}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FF5722" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Edit Success Modal */}
      {isEditSuccessOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <button
              onClick={() => setIsEditSuccessOpen(false)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "#5C2E1F" }}
            >
              Successfully Updated!
            </h2>
            <p className="text-gray-600 mb-6">
              Product information has been updated successfully.
            </p>
            <button
              onClick={() => setIsEditSuccessOpen(false)}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FF5722" }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <button
              onClick={closeSuccessModal}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "#5C2E1F" }}
            >
              Product Added Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Product details were added successfully to the system.
            </p>
            <button
              onClick={closeSuccessModal}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FF5722" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Sticker Preview Modal */}
      {isStickerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => {
            if (stickerPreviewUrl) URL.revokeObjectURL(stickerPreviewUrl);
            if (barcodeStickerPreviewUrl) URL.revokeObjectURL(barcodeStickerPreviewUrl);
            if (productStickerPreviewUrl) URL.revokeObjectURL(productStickerPreviewUrl);
            setIsStickerModalOpen(false);
            setStickerProduct(null);
            setStickerPreviewUrl("");
            setBarcodeStickerPreviewUrl("");
            setProductStickerPreviewUrl("");
          }}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className="text-xl font-bold"
                style={{ color: "#5C2E1F" }}
              >
                Sticker Preview
              </h2>
              <button
                onClick={() => {
                  if (stickerPreviewUrl) URL.revokeObjectURL(stickerPreviewUrl);
                  if (barcodeStickerPreviewUrl) URL.revokeObjectURL(barcodeStickerPreviewUrl);
                  if (productStickerPreviewUrl) URL.revokeObjectURL(productStickerPreviewUrl);
                  setIsStickerModalOpen(false);
                  setStickerProduct(null);
                  setStickerPreviewUrl("");
                  setBarcodeStickerPreviewUrl("");
                  setProductStickerPreviewUrl("");
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {isGeneratingSticker ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3 text-gray-600">Generating sticker...</span>
              </div>
            ) : (
              <>
                {/* Product Info */}
                {stickerProduct && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <p><strong>Product:</strong> {stickerProduct.product_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ingredients: {stickerProduct.product_ingredient || 'No ingredients listed'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Shelf Life: {stickerProduct.product_shelflife || 'Not specified'}
                    </p>
                  </div>
                )}

                {/* Sticker Type Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#5C2E1F" }}>
                    Sticker Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStickerType("barcode")}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        stickerType === "barcode"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Barcode Sticker
                    </button>
                    <button
                      onClick={() => setStickerType("product")}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        stickerType === "product"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Product Sticker
                    </button>
                  </div>
                </div>

                {/* Barcode Sticker Section */}
                {stickerType === "barcode" && (
                  <>
                    <div className="mb-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "#5C2E1F" }}>
                        Barcode Sticker Settings
                      </h3>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: "#5C2E1F" }}>
                          13-Digit Barcode (starts with 3)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={barcode13Digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                              setBarcode13Digit(val);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                            placeholder="3000000000001"
                            maxLength={13}
                          />
                          <button
                            onClick={() => {
                              const newBarcode = generate13DigitBarcode(barcode13Digit);
                              setBarcode13Digit(newBarcode);
                            }}
                            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Generate
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {barcode13Digit.length}/13 digits
                        </p>
                      </div>
                    </div>

                    {/* Update Preview Button */}
                    <div className="mb-4 flex gap-2">
                      <button
                        onClick={regenerateBarcodeStickerPreview}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                        Update Preview
                      </button>
                      <button
                        onClick={handleSaveStickerCodes}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={16} />
                        Save Codes
                      </button>
                    </div>

                    {/* Barcode Sticker Preview */}
                    <div className="flex justify-center mb-4 p-4 bg-gray-100 rounded-lg">
                      {barcodeStickerPreviewUrl ? (
                        <embed
                          src={`${barcodeStickerPreviewUrl}#view=FitH&zoom=page-fit`}
                          type="application/pdf"
                          className="border border-gray-300 rounded bg-white"
                          style={{ width: '500px', height: '280px' }}
                        />
                      ) : (
                        <div className="text-gray-500 py-8">Click &quot;Update Preview&quot; to generate sticker</div>
                      )}
                    </div>

                    {/* Size Info */}
                    <p className="text-xs text-gray-500 text-center mb-4">
                      Sticker size: 3cm x 1.5cm
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleBarcodeStickerDownload}
                        className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        style={{ backgroundColor: "#FF5722" }}
                        disabled={!barcode13Digit || barcode13Digit.length !== 13}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7,10 12,15 17,10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Barcode Sticker
                      </button>
                      <button
                        onClick={() => {
                          if (stickerPreviewUrl) URL.revokeObjectURL(stickerPreviewUrl);
                          if (barcodeStickerPreviewUrl) URL.revokeObjectURL(barcodeStickerPreviewUrl);
                          if (productStickerPreviewUrl) URL.revokeObjectURL(productStickerPreviewUrl);
                          setIsStickerModalOpen(false);
                          setStickerProduct(null);
                          setStickerPreviewUrl("");
                          setBarcodeStickerPreviewUrl("");
                          setProductStickerPreviewUrl("");
                        }}
                        className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#5C2E1F", color: "#5C2E1F" }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}

                {/* Product Sticker Section */}
                {stickerType === "product" && (
                  <>
                    <div className="mb-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "#5C2E1F" }}>
                        Product Sticker Settings
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: "#5C2E1F" }}>
                            BBD (Best Before Date)
                          </label>
                          <input
                            type="text"
                            value={bbdDate}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                              setBbdDate(val);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                            placeholder="DDMMYYYY"
                            maxLength={8}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Format: DDMMYYYY (e.g., 15062026)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: "#5C2E1F" }}>
                            GPBN Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={gpbnCode}
                              onChange={(e) => setGpbnCode(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                              placeholder="GPBN3000"
                            />
                            <button
                              onClick={() => {
                                setGpbnCode(generateNextGpbnCode(gpbnCode));
                              }}
                              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                            >
                              +1
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Starts with 3000
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            const newBbd = calculateBBD(stickerProduct?.product_shelflife || '3 months');
                            setBbdDate(newBbd);
                          }}
                          className="text-sm text-orange-600 hover:text-orange-700 underline"
                        >
                          Recalculate BBD from shelf life
                        </button>
                      </div>
                    </div>

                    {/* Update Preview Button */}
                    <div className="mb-4 flex gap-2">
                      <button
                        onClick={regenerateProductStickerPreview}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                        Update Preview
                      </button>
                      <button
                        onClick={handleSaveStickerCodes}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={16} />
                        Save Codes
                      </button>
                    </div>

                    {/* Product Sticker Preview */}
                    <div className="flex justify-center mb-4 p-4 bg-gray-100 rounded-lg">
                      {productStickerPreviewUrl ? (
                        <embed
                          src={`${productStickerPreviewUrl}#view=FitH&zoom=page-fit`}
                          type="application/pdf"
                          className="border border-gray-300 rounded bg-white"
                          style={{ width: '500px', height: '280px' }}
                        />
                      ) : (
                        <div className="text-gray-500 py-8">Click &quot;Update Preview&quot; to generate sticker</div>
                      )}
                    </div>

                    {/* Size Info */}
                    <p className="text-xs text-gray-500 text-center mb-4">
                      Sticker size: 3cm x 1.5cm
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleProductStickerDownload}
                        className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        style={{ backgroundColor: "#FF5722" }}
                        disabled={!bbdDate || !gpbnCode}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7,10 12,15 17,10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Product Sticker
                      </button>
                      <button
                        onClick={() => {
                          if (stickerPreviewUrl) URL.revokeObjectURL(stickerPreviewUrl);
                          if (barcodeStickerPreviewUrl) URL.revokeObjectURL(barcodeStickerPreviewUrl);
                          if (productStickerPreviewUrl) URL.revokeObjectURL(productStickerPreviewUrl);
                          setIsStickerModalOpen(false);
                          setStickerProduct(null);
                          setStickerPreviewUrl("");
                          setBarcodeStickerPreviewUrl("");
                          setProductStickerPreviewUrl("");
                        }}
                        className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#5C2E1F", color: "#5C2E1F" }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
