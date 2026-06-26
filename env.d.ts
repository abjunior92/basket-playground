/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

interface Window {
	goatcounter?: {
		count: (vars: { path: string }) => void
	}
}
