export type SealEncryptionMeta = {
  sealKeyId: string;
  wrappedDek: string;
  /** Base64 IV per media file (comma-separated when stored on-chain). */
  ivs: string[];
  /** First-published package ID used for Seal wrap/unwrap. */
  sealPackageId?: string;
};

export type InlineSealMeta = {
  sealKeyId: string;
  wrappedDek: string;
  iv: string;
  originalContentType?: string;
  /** Package ID used when the DEK was wrapped — required after in-place upgrades. */
  sealPackageId?: string;
};

const SEAL_META_DELIMITER = '@@';

const LEGACY_SEAL_PACKAGE_ID =
  '0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937';

/** Pre-embed posts published before seal metadata was stored on-chain. */
const LEGACY_SEAL_META_BY_MEDIA_ID: Record<string, InlineSealMeta> = {
  'fLoF4U2nywQKry_GYGgYb5xmY1SUACvEcc45S-QZ5MoBAgAQAA': {
    sealKeyId: '5e8b307ca13731242c102e62494446d6',
    sealPackageId: LEGACY_SEAL_PACKAGE_ID,
    wrappedDek:
      'AOX3AjWLcRojbGGO1gwuCElkNW4ZDzUPgExAOWIwNVk3EF6LMHyhNzEkLBAuYklERtYCc9BdYsGNk3Tj6lKejg7WFh2hoUGpTT92rj/k6ZNW23UB9dFKgamCFErkQc19ZLCQJ/EWpGi9NufspJT3UFkWI8gCAgCAu/kCn6JjL2Cue+ELpxrbgfYmc9gRDQSNwwC8witOowKaI7+va9IBc3nI5OJSI/0EMckrX6ig75ooMQMRLRhXYlB29dqNzECGZJ9PahX13t6aWajACysBONbeYjFNeJoCv3u3C1GIIQzg6RE7aubDvj/KiPDmkMacIuAjxhrUS4w6BI6QExNZZgCkjGqJRxPOBDlGXZEx+jktybCX3bo9rRxt+FFBH532ME4+IT0SFkbvcNC60IYIfDP3awaG8k9CADDg1T+tyCuYV/ZuVYf00NDu2nQaVTFNgT2yiRLG5VV83mpFTwnzkX9M7y7rXD20mVkBAA==',
    iv: '8zyUUFyuX/Jcjcxh',
    originalContentType: 'image/png',
  },
};

export function encodeSealObjectId(mediaIds: string[], meta?: SealEncryptionMeta) {
  const ids = mediaIds.map((id) => id.trim()).filter(Boolean).join(',');
  if (!meta) return ids;
  const parts = [
    ids,
    meta.sealKeyId,
    meta.ivs.map((iv) => iv.trim()).filter(Boolean).join(','),
    meta.wrappedDek,
  ];
  if (meta.sealPackageId) parts.push(meta.sealPackageId);
  return parts.join(SEAL_META_DELIMITER);
}

export function parseSealObjectId(raw: string): {
  mediaIds: string[];
  meta?: SealEncryptionMeta;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { mediaIds: [] };

  const parts = trimmed.split(SEAL_META_DELIMITER);
  if (parts.length === 4 || parts.length === 5) {
    const [idsPart, sealKeyId, ivPart, wrappedDek, sealPackageId] = parts;
    return {
      mediaIds: splitMediaIds(idsPart),
      meta: {
        sealKeyId,
        wrappedDek,
        ivs: ivPart.split(',').map((iv) => iv.trim()).filter(Boolean),
        ...(sealPackageId ? { sealPackageId } : {}),
      },
    };
  }

  return { mediaIds: splitMediaIds(trimmed) };
}

function splitMediaIds(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((id) => id.trim()).filter(Boolean);
  }
  return [trimmed];
}

export function sealMetaForMediaIndex(
  meta: SealEncryptionMeta | undefined,
  index: number,
  mediaId?: string,
): InlineSealMeta | undefined {
  if (meta) {
    const iv = meta.ivs[index] ?? meta.ivs[0];
    if (!iv) return undefined;
    return {
      sealKeyId: meta.sealKeyId,
      wrappedDek: meta.wrappedDek,
      iv,
      sealPackageId: meta.sealPackageId,
    };
  }

  if (mediaId) {
    return LEGACY_SEAL_META_BY_MEDIA_ID[mediaId.trim()];
  }

  return undefined;
}
