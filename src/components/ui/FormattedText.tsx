import React from 'react';

interface FormattedTextProps {
  text?: string | null;
  className?: string;
  markClassName?: string;
}

/**
 * Componente para renderizar texto de forma segura parseando etiquetas <mark>...</mark>
 * aplicadas por la IA durante adaptaciones in-line de perfil o sustituciones.
 */
export function FormattedText({
  text,
  className,
  markClassName = 'bg-amber-100 text-[#a86224] font-semibold px-1 py-0.5 rounded-md border border-amber-300/60 not-italic underline decoration-amber-400 underline-offset-2',
}: FormattedTextProps) {
  if (!text) return null;

  // Si no contiene etiquetas <mark>, renderizar como texto plano
  if (!text.toLowerCase().includes('<mark>')) {
    return <span className={className}>{text}</span>;
  }

  // Dividir el texto conservando las etiquetas <mark>...</mark>
  const parts = text.split(/(<mark>[\s\S]*?<\/mark>)/gi);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const lower = part.toLowerCase();
        if (lower.startsWith('<mark>') && lower.endsWith('</mark>')) {
          const content = part.slice(6, -7);
          return (
            <mark key={index} className={markClassName}>
              {content}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
