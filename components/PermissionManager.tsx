/**
 * A component that facilitates LYX token transfers to a specified LUKSO address.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.selectedAddress] - Optional hex address of the donation recipient.
 *                                          If not provided, uses the first address from context.
 *
 * Features:
 * - Amount validation (${minAmount}-${maxAmount} LYX)
 * - Integration with UP Browser wallet
 * - Recipient profile display using LuksoProfile
 * - Real-time amount validation
 *
 * @requires useUpProvider - Hook for UP Browser wallet integration
 * @requires LuksoProfile - Component for displaying LUKSO profile information
 * @requires viem - For handling blockchain transactions
 */
"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useUpProvider } from "./upProvider";
import { LuksoProfile } from "./LuksoProfile";
import { ERC725 } from "@erc725/erc725.js";
import LSP6Schema from "@erc725/erc725.js/schemas/LSP6KeyManager.json";
import { encodeFunctionData, isAddress } from "viem";
import { request } from "graphql-request";
import { Permissions } from "@erc725/erc725.js/build/main/src/types/Method";
import { Profile, gqlQuery, IPFS_GATEWAY } from "./ProfileSearch";
import { RoleCard } from './RoleCard';

// --- Constants (Moved to top level) ---
const RPC_ENDPOINT_TESTNET = "https://rpc.testnet.lukso.network";
const RPC_ENDPOINT_MAINNET = "https://rpc.mainnet.lukso.network";
const ENVIO_TESTNET_URL =
  "https://envio.lukso-testnet.universal.tech/v1/graphql";
const ENVIO_MAINNET_URL =
  "https://envio.lukso-mainnet.universal.tech/v1/graphql";

// Define Role type and the ordered list of roles
// Export the Role type
export type Role = "Treasury Manager" | "Token Manager" | "Data Manager";
const ROLES: Role[] = ["Treasury Manager", "Token Manager", "Data Manager"];

const ROLE_PERMISSIONS: Record<Role, Partial<Permissions>> = {
  "Treasury Manager": { SUPER_TRANSFERVALUE: true },
  "Token Manager": { CALL: true },
  "Data Manager": { SETDATA: true },
};

const ROLE_ENCODED_PERMISSIONS: Record<Role, `0x${string}`> = {
  "Data Manager": "0x0000000000000000000000000000000000000000000000000000000000040000",
  "Token Manager": "0x0000000000000000000000000000000000000000000000000000000000000800",
  "Treasury Manager": "0x0000000000000000000000000000000000000000000000000000000000000100",
};

// ABI for LSP6 KeyManager setDataBatch function
const setDataBatchAbi = [
  {
    type: 'function',
    name: 'setDataBatch',
    inputs: [
      { name: 'dataKeys', type: 'bytes32[]' },
      { name: 'dataValues', type: 'bytes[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  }
] as const;


export function PermissionManager() {
  const { client, accounts, contextAccounts, chainId, walletConnected } =
    useUpProvider();
  const userUpAddress = contextAccounts?.[0];

  // Restore correct state initializations
  const [selectedAddresses, setSelectedAddresses] = useState<Record<Role, `0x${string}` | null>>({
    "Treasury Manager": null,
    "Token Manager": null,
    "Data Manager": null,
  });
  const [searchQueries, setSearchQueries] = useState<Record<Role, string>>({
    "Treasury Manager": "",
    "Token Manager": "",
    "Data Manager": "",
  });
  const [searchResults, setSearchResults] = useState<Record<Role, Profile[]>>({
    "Treasury Manager": [],
    "Token Manager": [],
    "Data Manager": [],
  });
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({}); // Keep empty object initialization
  const [showSearchDropdown, setShowSearchDropdown] = useState<Record<Role, boolean>>({
    "Treasury Manager": false,
    "Token Manager": false,
    "Data Manager": false,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const erc725Instance = useMemo(() => {
    if (!userUpAddress || !chainId) return null;
    const rpcEndpoint =
      chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_TESTNET;
    return new ERC725(LSP6Schema, userUpAddress, rpcEndpoint, {
      ipfsGateway: IPFS_GATEWAY,
    });
  }, [userUpAddress, chainId]);

  // --- Effect to load existing controllers on mount ---
  useEffect(() => {
    if (!erc725Instance || !userUpAddress) {
      setIsInitialLoading(false);
      return;
    }

    async function fetchExistingControllers() {
      setIsInitialLoading(true);
      try {
        const addressPermissionsArrayData = await erc725Instance!.getData(
          "AddressPermissions[]"
        );
        const controllerAddresses = (
          Array.isArray(addressPermissionsArrayData?.value)
            ? addressPermissionsArrayData.value
            : []
        ) as `0x${string}`[];

        if (!controllerAddresses || controllerAddresses.length === 0) {
          console.log("No existing controllers found.");
          setIsInitialLoading(false);
          return;
        }

        const updates: Partial<Record<Role, `0x${string}`>> = {};
        for (const address of controllerAddresses) {
          if (!address || !isAddress(address)) continue;

          try {
            const permissionsData = await erc725Instance!.getData({
              keyName: "AddressPermissions:Permissions:<address>",
              dynamicKeyParts: address,
            });
            const permissionsValue = permissionsData?.value as `0x${string}` | null;

            if (permissionsValue && permissionsValue !== '0x') {
              for (const role of ROLES) {
                const targetEncodedPerm = ROLE_ENCODED_PERMISSIONS[role];
                if (permissionsValue.toLowerCase() === targetEncodedPerm.toLowerCase()) {
                  updates[role] = address;
                  break;
                }
              }
            }
          } catch (permError) {
            console.warn(`Could not fetch permissions for ${address}:`, permError);
          }
        }

        if (Object.keys(updates).length > 0) {
          setSelectedAddresses(prev => ({ ...prev, ...updates }));
        }

      } catch (error) {
        console.error("Error fetching existing controllers:", error);
      } finally {
        setIsInitialLoading(false);
      }
    }

    fetchExistingControllers();
  }, [erc725Instance, userUpAddress]);

  // --- Search Logic ---
  const handleSearch = useCallback(
    async (role: Role, query: string) => {
      setSearchQueries((prev) => ({ ...prev, [role]: query }));
      setShowSearchDropdown((prev) => ({ ...prev, [role]: true }));

      if (query.length < 3) {
        setSearchResults((prev) => ({ ...prev, [role]: [] }));
        return;
      }

      setLoadingStates((prev) => ({ ...prev, [`search-${role}`]: true }));
      try {
        const envioUrl = chainId === 42 ? ENVIO_MAINNET_URL : ENVIO_TESTNET_URL;
        const result = (await request(envioUrl, gqlQuery, {
          id: query,
        })) as { search_profiles: Profile[] };
        setSearchResults((prev) => ({
          ...prev,
          [role]: result.search_profiles || [],
        }));
      } catch (error) {
        console.error(`Search error for ${role}:`, error);
        setSearchResults((prev) => ({ ...prev, [role]: [] }));
      } finally {
        setLoadingStates((prev) => ({ ...prev, [`search-${role}`]: false }));
      }
    },
    [chainId]
  );

  const handleSelectProfile = useCallback((role: Role, profile: Profile) => {
    setSelectedAddresses((prev) => ({ ...prev, [role]: profile.id as `0x${string}` }));
    setShowSearchDropdown((prev) => ({ ...prev, [role]: false }));
    setSearchQueries((prev) => ({ ...prev, [role]: "" }));
    setSearchResults((prev) => ({ ...prev, [role]: [] }));
  }, []);

  const clearSelection = (role: Role) => {
    setSelectedAddresses((prev) => ({ ...prev, [role]: null }));
  };

  // --- Permission Granting Logic (Refactored) ---
  const grantPermission = useCallback(
    async (role: Role) => {
      const controllerAddress = selectedAddresses[role];
      // Basic prerequisite checks
      if (
        !client ||
        !walletConnected ||
        !userUpAddress ||
        !controllerAddress ||
        !erc725Instance
      ) {
        console.error("Prerequisites not met for granting permission.");
        return;
      }
      // Address format check
      if (!isAddress(userUpAddress) || !isAddress(controllerAddress)) {
        console.error("Invalid address format detected.");
        return;
      }

      setLoadingStates((prev) => ({ ...prev, [`add-${role}`]: true }));
      try {
        // 1. Get current controllers
        const addressPermissionsArrayData = await erc725Instance.getData(
          "AddressPermissions[]"
        );
        const currentControllers = (
          Array.isArray(addressPermissionsArrayData?.value) ? addressPermissionsArrayData.value : []
        ) as `0x${string}`[]; // Ensure type safety

        console.log("Current controllers:", currentControllers);

        // 2. Check if the controller already exists
        const lowerCaseControllerAddress = controllerAddress.toLowerCase();
        const isExistingController = currentControllers.some(
          (addr) => addr && typeof addr === 'string' && addr.toLowerCase() === lowerCaseControllerAddress
        );

        console.log("Is existing controller:", isExistingController);

        // 3. Determine new/merged permissions
        const newPermissions = ROLE_PERMISSIONS[role];
        let finalPermissions = { ...newPermissions };
        let existingPermissionsValue: string | null = null;

        if (isExistingController) {
          try {
            const existingPermissionsData = await erc725Instance.getData({
              keyName: "AddressPermissions:Permissions:<address>",
              dynamicKeyParts: controllerAddress,
            });
            existingPermissionsValue = existingPermissionsData?.value as string | null;

            if (existingPermissionsValue && existingPermissionsValue !== '0x') {
              const decodedExisting = erc725Instance.decodePermissions(existingPermissionsValue);
              // Merge: New permissions overwrite/add to existing ones
              finalPermissions = { ...decodedExisting, ...newPermissions };
              console.log("Merged permissions:", finalPermissions);
            } else {
              console.log("Existing controller found, but no permissions set or invalid data. Applying new permissions.");
            }
          } catch (err) {
            console.warn(`Could not fetch/decode existing permissions for ${controllerAddress}, proceeding with new permissions. Error:`, err);
            // Fallback to just new permissions if fetching/decoding fails
            finalPermissions = { ...newPermissions };
          }
        } else {
          console.log("New controller detected. Applying new permissions.");
        }

        // 4. Encode final permissions
        const encodedFinalPermissions = erc725Instance.encodePermissions(finalPermissions);
        console.log("Encoded final permissions:", encodedFinalPermissions);

        // 5. Prepare data payload(s) using encodeData
        let keysToSet: `0x${string}`[] = [];
        let valuesToSet: `0x${string}`[] = [];

        // Always encode the data for the specific controller's permissions
        const permissionData = erc725Instance.encodeData([
          {
            keyName: "AddressPermissions:Permissions:<address>",
            dynamicKeyParts: controllerAddress,
            value: encodedFinalPermissions,
          },
        ]);
        // Assert the types returned by encodeData
        keysToSet.push(...(permissionData.keys as `0x${string}`[]));
        valuesToSet.push(...(permissionData.values as `0x${string}`[]));

        // If it's a new controller, also encode the update for the AddressPermissions[] array
        if (!isExistingController) {
          const updatedControllersArray = [...currentControllers, controllerAddress];
          const arrayUpdateData = erc725Instance.encodeData([
            {
              keyName: "AddressPermissions[]",
              value: updatedControllersArray
            }
          ]);
          // Assert the types returned by encodeData
          keysToSet.push(...(arrayUpdateData.keys as `0x${string}`[]));
          valuesToSet.push(...(arrayUpdateData.values as `0x${string}`[]));
        }

        console.log("Final Keys to set:", keysToSet);
        console.log("Final Values to set:", valuesToSet);

        // 6. Encode the setDataBatch function call using the prepared keys and values
        const setDataBatchPayload = encodeFunctionData({
          abi: setDataBatchAbi,
          functionName: "setDataBatch",
          args: [keysToSet, valuesToSet],
        });
        console.log("setDataBatchPayload:", setDataBatchPayload);

        if (!setDataBatchPayload) {
          throw new Error("Failed to encode setDataBatch payload");
        }

        // 7. Send the transaction
        const txHash = await client.sendTransaction({
          account: accounts[0] as `0x${string}`, // UP owner EOA
          to: userUpAddress, // Target UP address
          data: setDataBatchPayload,
          chain: client.chain,
        });

        console.log(
          `Transaction sent to ${isExistingController ? 'update' : 'add'} controller ${controllerAddress} with role ${role}: ${txHash}`
        );

      } catch (err) {
        console.error(`Failed to grant permission for ${role}:`, err);
      } finally {
        setLoadingStates((prev) => ({ ...prev, [`add-${role}`]: false }));
      }
    },
    [
      selectedAddresses,
      client,
      walletConnected,
      userUpAddress,
      erc725Instance,
      accounts,
    ]
  );

  // --- UI Rendering ---
  return (
    <div className="w-full max-h-[900px] overflow-y-auto bg-white/80 backdrop-blur-md rounded-2xl p-6 space-y-6">
      <p className="text-md text-center text-gray-600 mb-6">
        Assign roles to other profiles to manage this Universal Profile <lukso-username address={userUpAddress}></lukso-username>
      </p>

      {isInitialLoading && (
        <div className="text-center text-gray-500 font-semibold py-4">
          Loading existing permissions...
        </div>
      )}

      {!walletConnected && !isInitialLoading && (
        <div className="text-center text-red-500 font-semibold">
          Please connect your Universal Profile wallet.
        </div>
      )}

      {!isInitialLoading && (
        <div className="flex flex-wrap justify-around gap-2 mb-12">
          {ROLES.map((role) => (
            <RoleCard
              key={role}
              role={role}
              selectedAddress={selectedAddresses[role]}
              searchQuery={searchQueries[role]}
              searchResults={searchResults[role]}
              isLoadingSearch={!!loadingStates[`search-${role}`]}
              isLoadingGrant={!!loadingStates[`add-${role}`]}
              showSearchDropdown={showSearchDropdown[role]}
              walletConnected={walletConnected}
              onClearSelection={() => clearSelection(role)}
              onGrantPermission={() => grantPermission(role)}
              onSearch={(query) => handleSearch(role, query)}
              onSelectProfile={(profile) => handleSelectProfile(role, profile)}
            />
          ))}
        </div>
      )}

      {/* Display Permission Manager (User's own UP) */}
      <div className="bg-lime-50 p-4 rounded-lg shadow border border-lime-200 gap-2 flex flex-col items-center">
        <h2 className="text-lg font-semibold text-lime-700 text-center">
          Permission Manager
        </h2>
        {userUpAddress ? (
          <LuksoProfile address={userUpAddress} />
        ) : (
          <p className="text-sm text-gray-500">Loading your profile...</p>
        )}
      </div>
    </div>
  );
}