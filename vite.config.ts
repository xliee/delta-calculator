import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  // Determine base URL based on environment
  // For GitHub Pages: /<repository-name>/
  // For local development: ./
  const base = process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
    : "./";

  return {
    // Base public path when served in development or production
    // GitHub Pages will serve from /<repo-name>/ path
    base,

    // Build configuration
    build: {
      // Output directory for build assets
      outDir: "dist",

      // Generate sourcemaps for easier debugging
      sourcemap: true,

      // Optimize for modern browsers
      target: "es2020",

      // Rollup options for advanced bundling control
      rollupOptions: {
        output: {
          // Optimize chunk splitting for better caching
          manualChunks: {
            // Separate vendor libraries
            three: ["three"],
            "three-controls": ["three/examples/jsm/controls/OrbitControls.js"],
            "three-loaders": ["three/examples/jsm/loaders/STLLoader.js"],
          },
        },
      },

      // Optimize for delta calculator assets
      assetsDir: "assets",

      // Reduce chunk size warnings threshold for Three.js
      chunkSizeWarningLimit: 1000,
    },

    // Development server configuration
    server: {
      // Port for development server
      port: 3000,

      // Automatically open browser
      open: true,

      // Enable CORS for STL file loading
      cors: true,

      // Host configuration
      host: true,
    },

    // Preview server configuration (for 'vite preview')
    preview: {
      port: 4173,
      host: true,
    },

    // TypeScript configuration
    esbuild: {
      // Target modern JavaScript for better performance
      target: "es2020",
    },

    // Asset handling
    assetsInclude: [
      // Include STL files as assets
      "**/*.stl",
      // Include any additional 3D model formats if needed
      "**/*.obj",
      "**/*.gltf",
      "**/*.glb",
    ],

    // Optimization configuration
    optimizeDeps: {
      // Pre-bundle dependencies for faster dev server startup
      include: [
        "three",
        "three/examples/jsm/controls/OrbitControls.js",
        "three/examples/jsm/loaders/STLLoader.js",
      ],
      // Force optimization of ESM dependencies
      force: false,
    },

    // CSS configuration
    css: {
      // Enable CSS source maps
      devSourcemap: true,
    },

    // Worker configuration for potential future use
    worker: {
      format: "es",
    },

    // Environment handling
    envPrefix: "VITE_",
  };
});
