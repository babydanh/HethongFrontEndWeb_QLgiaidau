import { useEffect, useState, useRef } from 'react';
import type { Region } from '@/types/region';
import { regionsApi } from '@/features/regions/api';

/**
 * Bỏ dấu tiếng Việt và chuẩn hóa ký tự
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let result = str;
  result = result.toLowerCase();
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  result = result.replace(/đ/g, 'd');
  // Xóa các ký tự đặc biệt thừa, giữ lại chữ, số và khoảng trắng
  result = result.replace(/[^a-z0-9\s]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

/**
 * Các bí danh phổ biến cho các tỉnh thành Việt Nam
 */
const PROVINCE_ALIASES: Record<string, string[]> = {
  // TP. Hồ Chí Minh
  '79': ['tp hcm', 'tphcm', 'tp ho chi minh', 'ho chi minh', 'hcm', 'sai gon', 'saigon'],
  // Hà Nội
  '01': ['ha noi', 'tp ha noi', 'hn', 'thu do ha noi'],
  // Đà Nẵng
  '48': ['da nang', 'tp da nang', 'dn'],
  // Hải Phòng
  '31': ['hai phong', 'tp hai phong', 'hp'],
  // Cần Thơ
  '92': ['can tho', 'tp can tho', 'ct'],
  // Bà Rịa - Vũng Tàu
  '77': ['ba ria vung tau', 'ba ria', 'vung tau', 'brvt'],
  // Bình Dương
  '74': ['binh duong', 'thu dau mot', 'di an', 'thuan an', 'bd'],
  // Đồng Nai
  '75': ['dong nai', 'bien hoa', 'long khanh'],
  // Thừa Thiên Huế
  '46': ['thua thien hue', 'tp hue', 'hue'],
  // Khánh Hòa
  '56': ['khanh hoa', 'nha trang', 'cam ranh'],
  // Lâm Đồng
  '68': ['lam dong', 'da lat', 'bao loc'],
  // Quảng Ninh
  '22': ['quang ninh', 'ha long', 'cam pha', 'uong bi'],
  // Kiên Giang
  '91': ['kien giang', 'phu quoc', 'rach gia'],
};

/**
 * Tìm Tỉnh/Thành phố từ chuỗi địa chỉ
 */
export function detectProvinceFromAddress(
  rawAddress: string,
  provinces: Region[]
): Region | null {
  if (!rawAddress || !provinces || provinces.length === 0) return null;

  const normalizedAddr = ` ${removeVietnameseTones(rawAddress)} `;

  // 1. Kiểm tra bí danh phổ biến trước (TP.HCM, HN, Đà Nẵng...)
  for (const [code, aliases] of Object.entries(PROVINCE_ALIASES)) {
    for (const alias of aliases) {
      const aliasPattern = new RegExp(`(^|\\s|\\W)${alias}(\\s|\\W|$)`, 'i');
      if (aliasPattern.test(normalizedAddr)) {
        const found = provinces.find((p) => String(p.code) === String(code));
        if (found) return found;
      }
    }
  }

  // 2. Tìm theo tên đầy đủ và tên chuẩn của từng tỉnh
  // Sắp xếp các tỉnh có tên dài trước để tránh khớp nhầm (VD: Bình Phước trước Bình Dương)
  const sortedProvinces = [...provinces].sort((a, b) => {
    const lenA = (a.fullName || a.name || '').length;
    const lenB = (b.fullName || b.name || '').length;
    return lenB - lenA;
  });

  for (const p of sortedProvinces) {
    const rawName = p.name || '';
    const rawFullName = p.fullName || '';

    const normName = removeVietnameseTones(rawName);
    const normFullName = removeVietnameseTones(rawFullName);

    if (normFullName) {
      const pattern = new RegExp(`(^|\\s|\\W)${normFullName}(\\s|\\W|$)`, 'i');
      if (pattern.test(normalizedAddr)) return p;
    }

    if (normName && normName.length > 2) {
      const pattern = new RegExp(`(^|\\s|\\W)${normName}(\\s|\\W|$)`, 'i');
      if (pattern.test(normalizedAddr)) return p;
    }
  }

  return null;
}

/**
 * Tìm Phường/Xã từ chuỗi địa chỉ khi đã biết danh sách Wards của tỉnh
 */
export function detectWardFromAddress(
  rawAddress: string,
  wards: Region[]
): Region | null {
  if (!rawAddress || !wards || wards.length === 0) return null;

  const normalizedAddr = ` ${removeVietnameseTones(rawAddress)} `;

  // Sắp xếp tên dài trước để ưu tiên so khớp chính xác
  const sortedWards = [...wards].sort((a, b) => {
    const lenA = (a.fullName || a.name || '').length;
    const lenB = (b.fullName || b.name || '').length;
    return lenB - lenA;
  });

  // 1. So khớp có tiền tố rõ ràng như "phuong ...", "xa ...", "p. ...", "x. ...", "tt. ..."
  for (const w of sortedWards) {
    const normName = removeVietnameseTones(w.name || '');
    const normFullName = removeVietnameseTones(w.fullName || '');

    if (!normName) continue;

    // Pattern có tiền tố: p. 12, phuong 12, p 12, xa tan trieu, x tan trieu, thi tran...
    const prefixPatterns = [
      new RegExp(`(?:phuong|xa|thi\\s*tran|p|x|tt)[\\s\\.\\:]+${normName}(?:\\s|\\W|$)`, 'i'),
      normFullName ? new RegExp(`(^|\\s|\\W)${normFullName}(\\s|\\W|$)`, 'i') : null,
    ].filter(Boolean) as RegExp[];

    for (const pattern of prefixPatterns) {
      if (pattern.test(normalizedAddr)) {
        return w;
      }
    }
  }

  // 2. So khớp trực tiếp tên phường/xã (đối với tên chữ không phải số thuần túy)
  for (const w of sortedWards) {
    const normName = removeVietnameseTones(w.name || '');
    // Bỏ qua các phường chỉ là số (ví dụ: "1", "2") ở bước này để tránh khớp nhầm số nhà
    if (!normName || /^\d+$/.test(normName) || normName.length < 3) continue;

    const pattern = new RegExp(`(^|\\s|\\W)${normName}(\\s|\\W|$)`, 'i');
    if (pattern.test(normalizedAddr)) {
      return w;
    }
  }

  return null;
}

export interface DetectedAddressState {
  province?: Region | null;
  ward?: Region | null;
  isMatched: boolean;
}

export interface UseAutoAddressParserProps {
  addressValue?: string;
  provinces: Region[];
  wards: Region[];
  onSelectProvince: (provinceCode: string, provinceName?: string) => void;
  onSelectWard: (wardCode: string, wardName?: string) => void;
  onWardsLoaded?: (wards: Region[]) => void;
  enabled?: boolean;
}

/**
 * Custom hook tự động bóc tách và điền Tỉnh/Phường từ ô địa chỉ chi tiết
 */
export function useAutoAddressParser({
  addressValue = '',
  provinces,
  wards,
  onSelectProvince,
  onSelectWard,
  onWardsLoaded,
  enabled = true,
}: UseAutoAddressParserProps) {
  const [detectedState, setDetectedState] = useState<DetectedAddressState>({
    province: null,
    ward: null,
    isMatched: false,
  });

  const lastProcessedAddressRef = useRef<string>('');
  const lastMatchedProvinceCodeRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !addressValue || addressValue.trim().length < 3) {
      setDetectedState({ province: null, ward: null, isMatched: false });
      return;
    }

    const trimmed = addressValue.trim();
    if (trimmed === lastProcessedAddressRef.current) return;

    const timer = setTimeout(async () => {
      lastProcessedAddressRef.current = trimmed;

      // 1. Nhận diện Tỉnh / Thành
      const detectedProv = detectProvinceFromAddress(trimmed, provinces);
      if (detectedProv) {
        setDetectedState((prev) => ({
          ...prev,
          province: detectedProv,
          isMatched: true,
        }));

        if (lastMatchedProvinceCodeRef.current !== detectedProv.code) {
          lastMatchedProvinceCodeRef.current = detectedProv.code;
          onSelectProvince(detectedProv.code, detectedProv.fullName || detectedProv.name);

          // Tải wards nếu chưa có hoặc khác tỉnh
          try {
            const fetchedWards = await regionsApi.getWardsByProvince(detectedProv.code);
            if (onWardsLoaded) {
              onWardsLoaded(fetchedWards);
            }
            // Nhận diện Ward ngay sau khi tải xong
            const detectedW = detectWardFromAddress(trimmed, fetchedWards);
            if (detectedW) {
              setDetectedState((prev) => ({
                ...prev,
                ward: detectedW,
              }));
              onSelectWard(detectedW.code, detectedW.fullName || detectedW.name);
            }
          } catch {
            // bỏ qua nếu lỗi mạng
          }
          return;
        }
      }

      // 2. Nếu đã có sẵn danh sách Wards, thử nhận diện Ward
      if (wards && wards.length > 0) {
        const detectedW = detectWardFromAddress(trimmed, wards);
        if (detectedW) {
          setDetectedState((prev) => ({
            ...prev,
            ward: detectedW,
            isMatched: true,
          }));
          onSelectWard(detectedW.code, detectedW.fullName || detectedW.name);
        }
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [addressValue, provinces, wards, enabled, onSelectProvince, onSelectWard, onWardsLoaded]);

  return detectedState;
}
