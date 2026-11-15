import { useId } from 'react';
import { ISRAEL_CITIES } from '../lib/cities.js';

// A text field that suggests Israeli cities while typing (any other place can still be typed)
export function CityInput({ value, onChange, placeholder = 'City', className = '' }) {
  const listId = useId();
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        className={className}
      />
      <datalist id={listId}>
        {ISRAEL_CITIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}
