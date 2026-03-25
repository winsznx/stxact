import { ImageResponse } from 'next/og';
import { BrandGlyph } from '@/components/BrandLogo';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

/**
 * Executes logic associated with icon.
 */
export default function Icon() {
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
          style={{ width: 512, height: 512 }}
        />
      </div>
    ),
    size
  );
}
