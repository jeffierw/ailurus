module ailurus::profile;

use ailurus::platform::{Self, Platform};
use std::string::String;
use sui::event;

#[error]
const EHandleTaken: vector<u8> = b"Handle is already taken";
#[error]
const EFanAlreadyExists: vector<u8> = b"Fan profile already exists";
#[error]
const EFanNotFound: vector<u8> = b"Fan profile not found";
#[error]
const EInvalidHandle: vector<u8> = b"Handle must not be empty";

public struct ProfileRegistry has key {
    id: UID,
    fans: vector<FanProfile>,
}

public struct FanProfile has store, drop, copy {
    owner: address,
    handle: String,
    display_name: String,
    bio: String,
    avatar_walrus_id: vector<u8>,
}

public struct FanRegistered has copy, drop {
    fan: address,
}

public struct FanProfileUpdated has copy, drop {
    fan: address,
}

/// One-time setup — share the registry object used by the frontend env.
public fun create_registry(ctx: &mut TxContext) {
    transfer::share_object(ProfileRegistry {
        id: object::new(ctx),
        fans: vector[],
    });
}

/// Registers the sender as a fan with a unique handle (creators use `register_creator`).
public fun register_fan(
    registry: &mut ProfileRegistry,
    platform: &Platform,
    handle: String,
    display_name: String,
    ctx: &mut TxContext,
) {
    assert!(handle.length() > 0, EInvalidHandle);
    let owner = ctx.sender();
    let (exists, _) = find_fan(registry, owner);
    assert!(!exists, EFanAlreadyExists);
    assert!(!platform::creator_handle_taken(platform, &handle), EHandleTaken);
    assert!(!fan_handle_taken(registry, &handle), EHandleTaken);

    registry.fans.push_back(FanProfile {
        owner,
        handle,
        display_name,
        bio: std::string::utf8(b""),
        avatar_walrus_id: vector[],
    });

    event::emit(FanRegistered { fan: owner });
}

public fun update_fan_profile(
    registry: &mut ProfileRegistry,
    display_name: String,
    bio: String,
    avatar_walrus_id: vector<u8>,
    ctx: &mut TxContext,
) {
    let owner = ctx.sender();
    let (exists, index) = find_fan(registry, owner);
    assert!(exists, EFanNotFound);
    let fan = &mut registry.fans[index];
    fan.display_name = display_name;
    fan.bio = bio;
    fan.avatar_walrus_id = avatar_walrus_id;
    event::emit(FanProfileUpdated { fan: owner });
}

public fun fan_count(registry: &ProfileRegistry): u64 {
    registry.fans.length()
}

fun find_fan(registry: &ProfileRegistry, owner: address): (bool, u64) {
    let mut i = 0;
    let len = registry.fans.length();
    while (i < len) {
        if (registry.fans[i].owner == owner) {
            return (true, i)
        };
        i = i + 1;
    };
    (false, 0)
}

fun fan_handle_taken(registry: &ProfileRegistry, handle: &String): bool {
    let mut i = 0;
    let len = registry.fans.length();
    while (i < len) {
        if (&registry.fans[i].handle == handle) {
            return true
        };
        i = i + 1;
    };
    false
}
