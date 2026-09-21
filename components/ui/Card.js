export default function Card({ title, variant = "primary", actions, children }) {
  const variantColors = {
    primary: "border-blue-600",
    success: "border-green-600",
    info: "border-cyan-500",
    warning: "border-yellow-500",
    danger: "border-red-600",
    dark: "border-gray-800",
  };

  const headerColor = variantColors[variant] || "border-blue-600";

  return (
    <div className={`card shadow-sm border-t-[3px] ${headerColor} mb-4 bg-white rounded-lg flex flex-col`}>
      <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--card-border)] bg-transparent">
        <h3 className="text-[1.1rem] font-semibold text-gray-900 m-0 leading-none">
          {title}
        </h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4 flex-1">
        {children}
      </div>
    </div>
  );
}
