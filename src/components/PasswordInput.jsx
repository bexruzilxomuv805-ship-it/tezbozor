import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ value, onChange, placeholder, className = "" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} w-full pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition hover:opacity-70"
        style={{ color: "#8A8271" }}
      >
        {visible ? (
          <EyeOff key="off" size={17} className="animate-icon-pop" />
        ) : (
          <Eye key="on" size={17} className="animate-icon-pop" />
        )}
      </button>
    </div>
  );
}
