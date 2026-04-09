export default function Header({ userName }) {
    return (
        <header className="mb-6 flex items-center justify-between rounded-[28px] border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur-sm">
            <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-500">PersonaX</p>
                <h1 className="text-3xl font-bold text-white">AI Companion Platform</h1>
            </div>
            <div className="rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(182,255,77,0.18)]">
                {userName ? `Signed in: ${userName}` : "Guest mode"}
            </div>
        </header>
    );
}
