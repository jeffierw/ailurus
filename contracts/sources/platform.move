module ailurus::platform;

use std::string::String;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::dynamic_field as df;
use sui::event;

const MONTH_MS: u64 = 30 * 24 * 60 * 60 * 1000;
const MAX_PRICE_MICROS: u64 = 1_000_000_000;

#[error]
const ECreatorAlreadyExists: vector<u8> = b"Creator profile already exists";
#[error]
const ECreatorNotFound: vector<u8> = b"Creator profile not found";
#[error]
const EInvalidPrice: vector<u8> = b"Subscription price must be greater than zero";
#[error]
const EPriceTooHigh: vector<u8> = b"Subscription price is above the MVP limit";
#[error]
const EInsufficientPayment: vector<u8> = b"USDC payment is below the subscription price";
#[error]
const ENoSealAccess: vector<u8> = b"Subscriber does not have access to this Seal identity";

/// One-time witness for package initialization.
public struct PLATFORM has drop {}

public struct AdminCap has key, store {
    id: UID,
}

public struct Platform has key {
    id: UID,
    admin: address,
    creator_count: u64,
    post_count: u64,
    creators: vector<Creator>,
    posts: vector<Post>,
    subscriptions: vector<Subscription>,
}

public struct Creator has store, drop {
    owner: address,
    name: String,
    handle: String,
    bio: String,
    price_micros: u64,
    seal_policy_id: vector<u8>,
    subscriber_count: u64,
    post_count: u64,
    income_micros: u64,
}

public struct Post has store, drop {
    id: u64,
    creator: address,
    caption: String,
    content_type: u8,
    walrus_blob_id: vector<u8>,
    seal_object_id: vector<u8>,
    is_locked: bool,
    created_at_ms: u64,
}

public struct Subscription has store, drop {
    fan: address,
    creator: address,
    started_at_ms: u64,
    expires_at_ms: u64,
    paid_micros: u64,
}

public struct CreatorRegistered has copy, drop {
    creator: address,
    price_micros: u64,
}

public struct CreatorPriceUpdated has copy, drop {
    creator: address,
    price_micros: u64,
}

public struct PostPublished has copy, drop {
    post_id: u64,
    creator: address,
    content_type: u8,
    is_locked: bool,
}

public struct Subscribed has copy, drop {
    fan: address,
    creator: address,
    paid_micros: u64,
    expires_at_ms: u64,
}

public struct CreatorAvatarKey has copy, drop, store {
    owner: address,
}

fun init(_: PLATFORM, ctx: &mut TxContext) {
    let platform = Platform {
        id: object::new(ctx),
        admin: ctx.sender(),
        creator_count: 0,
        post_count: 0,
        creators: vector[],
        posts: vector[],
        subscriptions: vector[],
    };

    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    transfer::share_object(platform);
}

/// Registers the sender as a creator and stores the Seal policy pointer used by the app.
public fun register_creator(
    platform: &mut Platform,
    name: String,
    handle: String,
    bio: String,
    price_micros: u64,
    seal_policy_id: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(price_micros > 0, EInvalidPrice);
    assert!(price_micros <= MAX_PRICE_MICROS, EPriceTooHigh);

    let owner = ctx.sender();
    let (exists, _) = find_creator(platform, owner);
    assert!(!exists, ECreatorAlreadyExists);

    platform.creators.push_back(Creator {
        owner,
        name,
        handle,
        bio,
        price_micros,
        seal_policy_id,
        subscriber_count: 0,
        post_count: 0,
        income_micros: 0,
    });
    platform.creator_count = platform.creator_count + 1;

    event::emit(CreatorRegistered { creator: owner, price_micros });
}

/// Updates the monthly subscription price for the sender's creator profile.
public fun update_price(platform: &mut Platform, price_micros: u64, ctx: &mut TxContext) {
    assert!(price_micros > 0, EInvalidPrice);
    assert!(price_micros <= MAX_PRICE_MICROS, EPriceTooHigh);

    let creator = creator_mut(platform, ctx.sender());
    creator.price_micros = price_micros;

    event::emit(CreatorPriceUpdated { creator: ctx.sender(), price_micros });
}

/// Publishes content metadata after the encrypted payload has been written to Walrus.
public fun publish_post(
    platform: &mut Platform,
    caption: String,
    content_type: u8,
    walrus_blob_id: vector<u8>,
    seal_object_id: vector<u8>,
    is_locked: bool,
    clock: &Clock,
    ctx: &mut TxContext,
): u64 {
    let creator_address = ctx.sender();
    let (exists, _) = find_creator(platform, creator_address);
    assert!(exists, ECreatorNotFound);

    platform.post_count = platform.post_count + 1;
    let post_id = platform.post_count;
    platform.posts.push_back(Post {
        id: post_id,
        creator: creator_address,
        caption,
        content_type,
        walrus_blob_id,
        seal_object_id,
        is_locked,
        created_at_ms: clock.timestamp_ms(),
    });
    let creator = creator_mut(platform, creator_address);
    creator.post_count = creator.post_count + 1;

    event::emit(PostPublished {
        post_id,
        creator: creator_address,
        content_type,
        is_locked,
    });

    post_id
}

/// Pays the creator in USDC-like coin `T` and creates or extends a monthly subscription.
public fun subscribe<T>(
    platform: &mut Platform,
    creator_address: address,
    mut payment: Coin<T>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<T> {
    let fan = ctx.sender();
    let now_ms = clock.timestamp_ms();
    let price = creator_price(platform, creator_address);

    assert!(payment.value() >= price, EInsufficientPayment);

    let paid = payment.split(price, ctx);
    transfer::public_transfer(paid, creator_address);

    let expires_at_ms = upsert_subscription(platform, fan, creator_address, now_ms, price);
    let creator = creator_mut(platform, creator_address);
    creator.income_micros = creator.income_micros + price;

    event::emit(Subscribed {
        fan,
        creator: creator_address,
        paid_micros: price,
        expires_at_ms,
    });

    payment
}

/// Seal approval hook dry-run by key servers.
/// `fan` is the subscriber wallet (bound to the Seal SessionKey); creators may pass themselves.
entry fun seal_approve(
    id: vector<u8>,
    platform: &Platform,
    fan: address,
    creator_address: address,
    clock: &Clock,
    _ctx: &TxContext,
) {
    assert!(id.length() > 0, ENoSealAccess);
    let now = clock.timestamp_ms();
    assert!(
        fan == creator_address || has_active_subscription(platform, fan, creator_address, now),
        ENoSealAccess,
    );
}

public fun creator_count(platform: &Platform): u64 {
    platform.creator_count
}

public fun post_count(platform: &Platform): u64 {
    platform.post_count
}

/// Returns true when a creator already uses this handle (case-sensitive string match).
public fun creator_handle_taken(platform: &Platform, handle: &String): bool {
    let mut i = 0;
    let len = platform.creators.length();
    while (i < len) {
        if (&platform.creators[i].handle == handle) {
            return true
        };
        i = i + 1;
    };
    false
}

public fun update_creator_profile(
    platform: &mut Platform,
    name: String,
    bio: String,
    ctx: &mut TxContext,
) {
    let creator = creator_mut(platform, ctx.sender());
    creator.name = name;
    creator.bio = bio;
}

public fun set_creator_avatar(
    platform: &mut Platform,
    avatar_walrus_id: vector<u8>,
    ctx: &mut TxContext,
) {
    let owner = ctx.sender();
    let (exists, _) = find_creator(platform, owner);
    assert!(exists, ECreatorNotFound);
    let key = CreatorAvatarKey { owner };
    if (df::exists_(&platform.id, key)) {
        df::remove<CreatorAvatarKey, vector<u8>>(&mut platform.id, key);
    };
    df::add(&mut platform.id, key, avatar_walrus_id);
}

public fun has_active_subscription(
    platform: &Platform,
    fan: address,
    creator_address: address,
    now_ms: u64,
): bool {
    let mut i = 0;
    let len = platform.subscriptions.length();
    while (i < len) {
        let subscription = &platform.subscriptions[i];
        if (subscription.fan == fan && subscription.creator == creator_address) {
            return subscription.expires_at_ms > now_ms
        };
        i = i + 1;
    };
    false
}

fun upsert_subscription(
    platform: &mut Platform,
    fan: address,
    creator_address: address,
    now_ms: u64,
    paid_micros: u64,
): u64 {
    let mut i = 0;
    let len = platform.subscriptions.length();
    while (i < len) {
        let subscription = &mut platform.subscriptions[i];
        if (subscription.fan == fan && subscription.creator == creator_address) {
            let base = if (subscription.expires_at_ms > now_ms) {
                subscription.expires_at_ms
            } else {
                now_ms
            };
            subscription.expires_at_ms = base + MONTH_MS;
            subscription.paid_micros = subscription.paid_micros + paid_micros;
            return subscription.expires_at_ms
        };
        i = i + 1;
    };

    let expires_at_ms = now_ms + MONTH_MS;
    platform.subscriptions.push_back(Subscription {
        fan,
        creator: creator_address,
        started_at_ms: now_ms,
        expires_at_ms,
        paid_micros,
    });
    let creator = creator_mut(platform, creator_address);
    creator.subscriber_count = creator.subscriber_count + 1;
    expires_at_ms
}

fun creator_mut(platform: &mut Platform, owner: address): &mut Creator {
    let (exists, index) = find_creator(platform, owner);
    assert!(exists, ECreatorNotFound);
    &mut platform.creators[index]
}

fun creator_price(platform: &Platform, owner: address): u64 {
    let (exists, index) = find_creator(platform, owner);
    assert!(exists, ECreatorNotFound);
    platform.creators[index].price_micros
}

fun find_creator(platform: &Platform, owner: address): (bool, u64) {
    let mut i = 0;
    let len = platform.creators.length();
    while (i < len) {
        if (platform.creators[i].owner == owner) {
            return (true, i)
        };
        i = i + 1;
    };
    (false, 0)
}
