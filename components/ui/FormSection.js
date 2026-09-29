/**
 * A titled group of fields.
 *
 * The surface, border and padding live on the `.form-section` class in
 * globals.css, which also removes them again when nested inside a `.card` so the
 * content is not boxed twice.
 */
export default function FormSection({ title, subtitle, icon, children }) {
  return (
    <div className="form-section mb-7">
      <div className="form-section-head flex items-start gap-3 pb-2.5 mb-4 border-b border-line">
        <div className="form-section-icon flex-shrink-0 grid place-items-center rounded-lg tint-blue w-8 h-8 text-[0.95rem]">
          <i className={`bi ${icon}`} aria-hidden="true" />
        </div>
        <div>
          <h4 className="form-section-title m-0 text-[0.95rem] font-semibold text-fg leading-[1.7]">
            {title}
          </h4>
          {subtitle && (
            <p className="form-section-subtitle m-0 text-[0.8rem] text-fg-subtle">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
