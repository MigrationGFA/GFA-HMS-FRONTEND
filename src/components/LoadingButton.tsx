import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

type Props = ButtonProps & {
  loading?: boolean;
  loadingText?: string;
};

export function LoadingButton({ loading, loadingText, children, disabled, ...props }: Props) {
  const showText = loading && loadingText;
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <Loader2 className={`h-4 w-4 animate-spin ${showText || children ? 'mr-2' : ''}`} />}
      {showText ? loadingText : children}
    </Button>
  );
}
