export default function AdSidebar() {
  const handleClick = () => {
    window.open('https://privoytruco.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center p-1 cursor-pointer"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
    >
      <img
        src="/banner-publicidad.png"
        alt="Club de Truco Premier - Publicidad"
        className="w-full h-full object-cover rounded-lg border border-slate-700"
        draggable="false"
      />
    </div>
  );
}
