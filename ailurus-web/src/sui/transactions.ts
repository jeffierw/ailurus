import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { AILURUS_CONFIG } from './config';

const encoder = new TextEncoder();

function requireContractConfig() {
  const { packageId, platformId, usdcType } = AILURUS_CONFIG;
  if (!packageId || !platformId || !usdcType) {
    throw new Error('Ailurus contract config is incomplete');
  }
  return { packageId, platformId, usdcType };
}

function bytes(value: string) {
  return Array.from(encoder.encode(value));
}

export type RegisterCreatorInput = {
  name: string;
  handle: string;
  bio: string;
  priceMicros: bigint;
  sealPolicyId: string;
};

export type PublishPostInput = {
  caption: string;
  contentType: 0 | 1 | 2;
  walrusBlobId: string;
  sealObjectId: string;
  isLocked: boolean;
};

export function buildRegisterCreatorTx(input: RegisterCreatorInput, sender?: string) {
  const { packageId, platformId } = requireContractConfig();
  const tx = new Transaction();
  if (sender) tx.setSender(sender);

  tx.moveCall({
    target: `${packageId}::platform::register_creator`,
    arguments: [
      tx.object(platformId),
      tx.pure.string(input.name),
      tx.pure.string(input.handle),
      tx.pure.string(input.bio),
      tx.pure.u64(input.priceMicros),
      tx.pure.vector('u8', bytes(input.sealPolicyId)),
    ],
  });

  return tx;
}

export function buildSubscribeTx(creatorAddress: string, priceMicros: bigint, sender: string) {
  const { packageId, platformId, usdcType } = requireContractConfig();
  const tx = new Transaction();
  tx.setSender(sender);

  const payment = coinWithBalance({ balance: priceMicros, type: usdcType });
  const [change] = tx.moveCall({
    target: `${packageId}::platform::subscribe`,
    typeArguments: [usdcType],
    arguments: [tx.object(platformId), tx.pure.address(creatorAddress), payment, tx.object.clock()],
  });
  tx.transferObjects([change], sender);

  return tx;
}

export function buildUpdatePriceTx(priceMicros: bigint, sender: string) {
  const { packageId, platformId } = requireContractConfig();
  const tx = new Transaction();
  tx.setSender(sender);

  tx.moveCall({
    target: `${packageId}::platform::update_price`,
    arguments: [tx.object(platformId), tx.pure.u64(priceMicros)],
  });

  return tx;
}

export function buildPublishPostTx(input: PublishPostInput, sender?: string) {
  const { packageId, platformId } = requireContractConfig();
  const tx = new Transaction();
  if (sender) tx.setSender(sender);

  tx.moveCall({
    target: `${packageId}::platform::publish_post`,
    arguments: [
      tx.object(platformId),
      tx.pure.string(input.caption),
      tx.pure.u8(input.contentType),
      tx.pure.vector('u8', bytes(input.walrusBlobId)),
      tx.pure.vector('u8', bytes(input.sealObjectId)),
      tx.pure.bool(input.isLocked),
      tx.object.clock(),
    ],
  });

  return tx;
}
