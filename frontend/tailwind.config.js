/** @type {import('tailwindcss').Config} */
module.exports = {
    content: {
        relative: true,
        files: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"]
    },
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#effdf6",
                    100: "#d8fbe9",
                    500: "#1da86f",
                    700: "#0f6a45",
                    900: "#093d29"
                }
            }
        }
    },
    plugins: []
};
