declare module 'react-hook-form' {
  import { ComponentType, RefObject } from 'react';

  export interface FieldError {
    type: string;
    message?: string;
  }

  export interface FormState<TFieldValues = any> {
    errors: Record<string, FieldError>;
    isSubmitting: boolean;
    isValid: boolean;
    isDirty: boolean;
    isLoading?: boolean;
  }

  export interface UseFormRegister<TFieldValues = any> {
    (name: string, rules?: any): {
      name: string;
      onChange: (event: any) => void;
      onBlur: (event: any) => void;
      ref: RefObject<any>;
    };
  }

  export interface UseFormReturn<TFieldValues = any> {
    register: UseFormRegister<TFieldValues>;
    handleSubmit: (onSubmit: (data: TFieldValues) => void | Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
    formState: FormState<TFieldValues>;
    watch: (name?: string) => any;
    reset: () => void;
    setValue: (name: string, value: any) => void;
    getValues: () => TFieldValues;
  }

  export function useForm<TFieldValues = any>(options?: any): UseFormReturn<TFieldValues>;
} 