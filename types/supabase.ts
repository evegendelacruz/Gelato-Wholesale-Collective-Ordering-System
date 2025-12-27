export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_user: {
        Row: {
          admin_auth_id: string;
          admin_acc_id: string;
          admin_fullName: string;
          admin_email: string;
          admin_role: string;
          admin_password: string;
          created_at: string;
        };
        Insert: {
          admin_auth_id?: string;
          admin_acc_id: string;
          admin_fullName: string;
          admin_email: string;
          admin_role: string;
          admin_password: string;
          created_at?: string;
        };
        Update: {
          admin_auth_id?: string;
          admin_acc_id?: string;
          admin_fullName?: string;
          admin_email?: string;
          admin_role?: string;
          admin_password?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};