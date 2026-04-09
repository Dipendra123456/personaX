import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../services/api";
import { useCompanionStore } from "../store/useCompanionStore";

export default function AuthScreen({ mode = "login" }) {
    const router = useRouter();
    const setAuth = useCompanionStore((state) => state.setAuth);
    const token = useCompanionStore((state) => state.token);
    const hydrateAuth = useCompanionStore((state) => state.hydrateAuth);
    const hasHydrated = useCompanionStore((state) => state.hasHydrated);
    const [activeMode, setActiveMode] = useState(mode);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [gender, setGender] = useState("male");
    const [age, setAge] = useState(18);
    const [nationality, setNationality] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!hasHydrated) {
            hydrateAuth();
            return;
        }

        if (token) {
            router.replace("/");
        }
    }, [token, router, hydrateAuth, hasHydrated]);

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const payload = { email, password };
            const result = activeMode === "signup"
                ? await api.register({ ...payload, name, gender, age: Number(age), nationality })
                : await api.login(payload);

            setAuth(result);
            router.push("/");
        } catch (err) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(182,255,77,0.12),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(122,223,122,0.08),_transparent_18%),linear-gradient(180deg,#111315_0%,#0c0d0f_100%)] text-white">
            <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
                <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="personax-card p-8">
                        <p className="text-xs uppercase tracking-[0.35em] text-brand-500">PersonaX</p>
                        <h1 className="mt-3 text-4xl font-bold text-white">Create your companion space</h1>
                        <p className="mt-4 max-w-xl text-sm text-slate-400">
                            Sign up to save companions, chat history, and custom game progress in your own account.
                            Existing users can log in to continue where they left off.
                        </p>
                        <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                <p className="font-semibold text-white">Unique accounts</p>
                                <p className="mt-1 text-slate-400">Email addresses are unique per user.</p>
                            </div>
                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                <p className="font-semibold text-white">Saved sessions</p>
                                <p className="mt-1 text-slate-400">Your token stays in local storage after refresh.</p>
                            </div>
                        </div>
                    </section>

                    <section className="personax-card p-6">
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
                            <button
                                type="button"
                                onClick={() => setActiveMode("login")}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeMode === "login" ? "bg-brand-500 text-black" : "text-slate-300"}`}
                            >
                                Login
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMode("signup")}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeMode === "signup" ? "bg-brand-500 text-black" : "text-slate-300"}`}
                            >
                                Sign Up
                            </button>
                        </div>

                        <form onSubmit={submit} className="mt-6 space-y-4">
                            {activeMode === "signup" ? (
                                <>
                                    <div>
                                        <label className="mb-2 block text-sm text-slate-300">Name</label>
                                        <input
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 px-3 py-3"
                                            placeholder="Your name"
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm text-slate-300">Gender</label>
                                            <select
                                                value={gender}
                                                onChange={(event) => setGender(event.target.value)}
                                                className="w-full rounded-xl border border-slate-700 px-3 py-3"
                                                required
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="non-binary">Non-binary</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm text-slate-300">Age</label>
                                            <input
                                                value={age}
                                                onChange={(event) => setAge(event.target.value)}
                                                className="w-full rounded-xl border border-slate-700 px-3 py-3"
                                                type="number"
                                                min="13"
                                                max="120"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm text-slate-300">Nationality</label>
                                        <input
                                            value={nationality}
                                            onChange={(event) => setNationality(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 px-3 py-3"
                                            placeholder="e.g., Nepali, Indian, American"
                                            required
                                        />
                                    </div>
                                </>
                            ) : null}

                            <div>
                                <label className="mb-2 block text-sm text-slate-300">Email</label>
                                <input
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="w-full rounded-xl border border-slate-700 px-3 py-3"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-slate-300">Password</label>
                                <input
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-700 px-3 py-3"
                                    type="password"
                                    placeholder="At least 6 characters"
                                    required
                                />
                            </div>

                            {error ? (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {error}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-brand-500 px-4 py-3 font-semibold text-black disabled:opacity-60"
                            >
                                {loading ? "Please wait..." : activeMode === "signup" ? "Create account" : "Log in"}
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </main>
    );
}
