import { QueryModuleType } from '../types';

export function applyInputMask(value: string, moduleType: QueryModuleType): string {
  if (!value) return '';

  switch (moduleType) {
    case 'cpf_1':
    case 'cpf_2':
    case 'cpf_3': {
      const numbers = value.replace(/\D/g, '').slice(0, 11);
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    case 'cnpj': {
      const numbers = value.replace(/\D/g, '').slice(0, 14);
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    case 'placa': {
      const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
      if (clean.length > 3 && /^[A-Z]{3}\d{4}$/.test(clean)) {
        return `${clean.slice(0, 3)}-${clean.slice(3)}`;
      }
      return clean;
    }
    case 'telefone': {
      const numbers = value.replace(/\D/g, '').slice(0, 11);
      if (numbers.length <= 10) {
        return numbers
          .replace(/^(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      }
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    case 'nome':
      return value.toUpperCase();
    case 'email':
      return value.toLowerCase().trim();
    default:
      return value;
  }
}

export function validateInput(value: string, moduleType: QueryModuleType): { isValid: boolean; message?: string } {
  if (!value || value.trim().length === 0) {
    return { isValid: false, message: 'Por favor, informe o dado para consulta.' };
  }

  const cleanVal = value.trim();

  switch (moduleType) {
    case 'cpf_1':
    case 'cpf_2':
    case 'cpf_3': {
      const digits = cleanVal.replace(/\D/g, '');
      if (digits.length !== 11) {
        return { isValid: false, message: 'CPF deve conter exatamente 11 dígitos numéricos.' };
      }
      return { isValid: true };
    }
    case 'cnpj': {
      const digits = cleanVal.replace(/\D/g, '');
      if (digits.length !== 14) {
        return { isValid: false, message: 'CNPJ deve conter exatamente 14 dígitos numéricos.' };
      }
      return { isValid: true };
    }
    case 'placa': {
      const clean = cleanVal.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (clean.length !== 7) {
        return { isValid: false, message: 'Placa deve conter 7 caracteres (Padrão Mercosul ou Tradicional).' };
      }
      return { isValid: true };
    }
    case 'telefone': {
      const digits = cleanVal.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        return { isValid: false, message: 'Telefone deve conter DDD + 8 ou 9 dígitos.' };
      }
      return { isValid: true };
    }
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanVal)) {
        return { isValid: false, message: 'Formato de e-mail inválido.' };
      }
      return { isValid: true };
    }
    case 'nome': {
      if (cleanVal.length < 3) {
        return { isValid: false, message: 'Informe ao menos o primeiro e segundo nome.' };
      }
      return { isValid: true };
    }
    default:
      return { isValid: true };
  }
}
