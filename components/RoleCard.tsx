"use client";

import React from 'react';
import Image from 'next/image';
import makeBlockie from 'ethereum-blockies-base64';
import { LuksoProfile } from './LuksoProfile';
import { Profile, IPFS_GATEWAY } from './ProfileSearch'; // Import shared types/constants
import type { Role } from './PermissionManager'; // Import Role type

// --- RoleCard Subcomponent --- 

export interface RoleCardProps { // Export interface if needed elsewhere, otherwise keep local
    role: Role;
    selectedAddress: `0x${string}` | null;
    isAssignedManager: boolean;
    searchQuery: string;
    searchResults: Profile[];
    isLoadingSearch: boolean;
    isLoadingGrant: boolean;
    showSearchDropdown: boolean;
    walletConnected: boolean;
    onClearSelection: () => void;
    onGrantPermission: () => void;
    onSearch: (query: string) => void;
    onSelectProfile: (profile: Profile) => void;
    onRemoveManager: (role: Role, address: `0x${string}`) => void;
}

export function RoleCard({
    role,
    selectedAddress,
    isAssignedManager,
    searchQuery,
    searchResults,
    isLoadingSearch,
    isLoadingGrant,
    showSearchDropdown,
    walletConnected,
    onClearSelection,
    onGrantPermission,
    onSearch,
    onSelectProfile,
    onRemoveManager
}: RoleCardProps) {
    return (
        <div
            // Removed key={role} - Key should be applied where the component is mapped
            className="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3 min-w-[250px] max-w-sm flex-1"
        >
            <h2 className="text-lg font-semibold text-gray-700 text-center">{role}</h2>

            {selectedAddress ? (
                // Show selected profile and actions
                <div className="space-y-3 flex flex-col items-center">
                    <LuksoProfile address={selectedAddress} />
                    <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {isAssignedManager ? (
                            // If manager is already assigned, only show Remove
                            <lukso-button
                                variant="danger"
                                size="small"
                                onClick={() => onRemoveManager(role, selectedAddress)}
                                disabled={isLoadingGrant} // Maybe disable if a removal tx is pending?
                            >
                                Remove {role}
                            </lukso-button>
                        ) : (
                            // If selected from search, show Clear and Grant
                            <>
                                <lukso-button
                                    variant="secondary"
                                    size="small"
                                    onClick={onClearSelection}
                                    disabled={isLoadingGrant}
                                >
                                    Clear
                                </lukso-button>
                                <lukso-button
                                    variant="primary"
                                    size="small"
                                    onClick={onGrantPermission}
                                    isLoading={isLoadingGrant}
                                    disabled={!walletConnected || isLoadingGrant}
                                >
                                    Grant {role}
                                </lukso-button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                // Show search input and results
                <div className="relative space-y-2">
                    <lukso-input
                        placeholder={`Search for ${role}...`}
                        value={searchQuery}
                        onInput={(e: any) => onSearch(e.target.value)}
                        is-full-width
                        is-disabled={!walletConnected || isLoadingSearch}
                    />
                    {isLoadingSearch && (
                        <p className="text-xs text-gray-500 pl-1 pt-1">Searching...</p>
                    )}

                    {showSearchDropdown && searchResults.length > 0 && (
                        <div className="absolute bg-white border border-gray-200 rounded-md shadow-lg z-10 w-full max-h-[180px] overflow-y-auto mt-1 text-sm">
                            {searchResults.map((profile) => {
                                const profileImage = profile.profileImages?.[0];
                                let imageUrl = profileImage?.url?.replace("ipfs://", IPFS_GATEWAY)
                                    || profileImage?.src?.replace("ipfs://", IPFS_GATEWAY);
                                return (
                                    <button
                                        key={profile.id}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors"
                                        onClick={() => onSelectProfile(profile)}
                                    >
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt={`${profile.name || profile.id} avatar`}
                                                className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                                                width={32}
                                                height={32}
                                                onError={(e) => { e.currentTarget.src = makeBlockie(profile.id); }}
                                            />
                                        ) : (
                                            <Image
                                                src={makeBlockie(profile.id)}
                                                alt={`${profile.name || profile.id} avatar`}
                                                className="w-8 h-8 rounded-full flex-shrink-0"
                                                width={32}
                                                height={32}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className="block font-medium text-sm text-gray-800 truncate">
                                                {profile.fullName || profile.name || "Unnamed Profile"}
                                            </span>
                                            <span className="block text-xs text-gray-500 truncate">
                                                {profile.id}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {showSearchDropdown &&
                        searchResults.length === 0 &&
                        searchQuery.length >= 3 &&
                        !isLoadingSearch && (
                            <p className="absolute bg-white border border-gray-200 rounded-md shadow-lg z-10 w-full mt-1 p-2 text-xs text-gray-500">
                                No profiles found.
                            </p>
                        )}
                    {!walletConnected && (
                        <p className="text-xs text-red-500 pl-1 pt-1">
                            Connect wallet to search.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
} 