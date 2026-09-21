export default function FormSection({ title, subtitle, icon, children }) {
  return (
    <div className="form-section mb-7">
      <div className="form-section-head flex items-start gap-3 pb-2.5 mb-4 border-b border-[var(--card-border)]">
        <div className="form-section-icon flex-shrink-0 grid place-items-center rounded-lg bg-blue-50 text-blue-600 w-8 h-8 text-[0.95rem]">
          <i className={`bi ${icon}`}></i>
        </div>
        <div>
          <h4 className="form-section-title m-0 text-[0.95rem] font-semibold text-gray-900 leading-[1.7]">
            {title}
          </h4>
          {subtitle && (
            <p className="form-section-subtitle m-0 text-[0.8rem] text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
