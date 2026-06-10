import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import './ClientAutocomplete.css';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface ClientAutocompleteProps {
  clients: Client[];
  value: string;
  onChange: (text: string) => void;
  onSelect: (client: Client) => void;
  placeholder?: string;
  required?: boolean;
}

export default function ClientAutocomplete({ 
  clients, 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Buscar clienta por nombre o teléfono...", 
  required 
}: ClientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = value ? clients.filter(c => 
    c.name.toLowerCase().includes(value.toLowerCase()) || 
    c.phone.includes(value)
  ) : clients;

  return (
    <div className="client-autocomplete" ref={wrapperRef}>
      <div className="client-autocomplete__input-wrapper">
        <Search size={16} className="client-autocomplete__icon" />
        <input 
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
      </div>
      
      {isOpen && (
        <div className="client-autocomplete__dropdown">
          {filtered.length > 0 ? (
            filtered.slice(0, 10).map(c => (
              <div 
                key={c.id} 
                className="client-autocomplete__item"
                onClick={() => {
                  setIsOpen(false);
                  onSelect(c);
                }}
              >
                <div className="client-autocomplete__item-name">{c.name}</div>
                <div className="client-autocomplete__item-phone">{c.phone}</div>
              </div>
            ))
          ) : (
            <div className="client-autocomplete__item-new" onClick={() => setIsOpen(false)}>
              <UserPlus size={16} />
              <span>Usar "{value}" como clienta nueva</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
