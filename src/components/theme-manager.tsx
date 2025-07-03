
'use client';

import { getSettingsAction } from '@/app/actions';
import { hexToHslString } from '@/lib/utils';
import { useEffect } from 'react';

export function ThemeManager({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const applyTheme = async () => {
            try {
                const settings = await getSettingsAction();
                if (settings.primaryColor) {
                    document.documentElement.style.setProperty('--primary', hexToHslString(settings.primaryColor));
                    document.documentElement.style.setProperty('--ring', hexToHslString(settings.primaryColor));
                }
                if (settings.accentColor) {
                    document.documentElement.style.setProperty('--accent', hexToHslString(settings.accentColor));
                }
                if (settings.backgroundColor) {
                    document.documentElement.style.setProperty('--background', hexToHslString(settings.backgroundColor));
                }
            } catch (error) {
                console.error("Failed to apply theme settings:", error);
            }
        };
        applyTheme();
    }, []);

    return <>{children}</>;
}
