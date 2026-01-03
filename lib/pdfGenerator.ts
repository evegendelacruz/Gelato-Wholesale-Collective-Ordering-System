import supabase from './client';

export async function generateInvoicePDFOnOrderCreation(orderId: number) {
  try {
    // Store PDF generation flag in database
    const { error } = await supabase
      .from('client_order')
      .update({ pdf_generated: true, pdf_generated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error in PDF generation:', error);
    return { success: false, error };
  }
}