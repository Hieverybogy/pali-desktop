export function Sidebar() {
  return (
    <aside>
      <div className="brand">
        <span className="brand-icon">p.</span>
        <span>
          Pali<span className="brand-dot">●</span>
        </span>
      </div>
      <div className="workspace-label">你的桌面小世界</div>
      <nav>
        <button className="selected">
          <span>◉</span> 我的夥伴 <span className="nav-dot" />
        </button>
      </nav>
      <div className="aside-bottom">
        <span className="status-dot" /> 一點陪伴，一點可愛
        <p>PALI DESKTOP · V0.3</p>
      </div>
    </aside>
  );
}
