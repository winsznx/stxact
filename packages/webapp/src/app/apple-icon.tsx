import { ImageResponse } from 'next/og';
import { BrandGlyph } from '@/components/BrandLogo';

/**
 * Exported constant for size.
 */
export const size = {
  width: 180,
  height: 180,
};

/**
 * Exported constant for content type.
 */
export const contentType = 'image/png';

/**
 * Executes logic associated with apple icon.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F9F7F2',
        }}
      >
        <BrandGlyph
          backgroundColor="#F9F7F2"
          borderColor="#14100C"
          accentColor="#F97316"
          detailColor="#8C847C"
          className="block"
          style={{ width: 180, height: 180 }}
        />
      </div>
    ),
    size
  );
}
