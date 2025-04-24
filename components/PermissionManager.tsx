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
  const managedUpAddress = contextAccounts?.[0]; // Renamed for clarity
  const visitorAddress = accounts?.[0]; // Get the visitor's address
  console.log("PermissionManager: Visitor Address:", visitorAddress); // Log visitor address
  console.log("PermissionManager: Managed UP Address:", managedUpAddress); // Log managed UP address

  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null); // State for current user's role

  // Restore correct state initializations
  const [selectedAddresses, setSelectedAddresses] = useState<Record<Role, `0x${string}` | null>>({
    "Treasury Manager": null,
    "Token Manager": null,
    "Data Manager": null,
  });
  // Add state to track definitively assigned managers
  const [assignedManagers, setAssignedManagers] = useState<Record<Role, `0x${string}` | null>>({
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
    // Use the managed UP address to fetch its data
    if (!managedUpAddress || !chainId) return null;
    const rpcEndpoint =
      chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_TESTNET;
    return new ERC725(LSP6Schema, managedUpAddress, rpcEndpoint, {
      ipfsGateway: IPFS_GATEWAY,
    });
  }, [managedUpAddress, chainId]); // Depend on managedUpAddress

  // --- Effect to load existing controllers on mount ---
  useEffect(() => {
    // Check if we have the instance (based on managedUpAddress) and the visitor's address
    if (!erc725Instance || !visitorAddress) {
        // We might not have the visitor address immediately, handle this case
        // Or, if no instance, we can't fetch.
        // We could set loading to false if visitorAddress is null after connection?
        // For now, just prevent fetching if either is missing.
        // Consider adding specific loading/state handling for missing visitor address.
        setIsInitialLoading(false); // Potentially set loading done if no visitorAddress is expected
        setCurrentUserRole(null); // Ensure role is null if no visitor
        console.log("useEffect: Missing erc725Instance or visitorAddress, skipping fetch.", { hasInstance: !!erc725Instance, hasVisitor: !!visitorAddress });
        return;
    }


    async function fetchExistingControllers() {
      setIsInitialLoading(true);
      setCurrentUserRole(null); // Reset role before fetching
      setAssignedManagers({ // Reset assigned managers before fetch
        "Treasury Manager": null,
        "Token Manager": null,
        "Data Manager": null,
      });
      try {
        console.log("fetchExistingControllers: Fetching permissions for Managed UP:", erc725Instance?.options?.address);
        const addressPermissionsArrayData = await erc725Instance!.getData(
          "AddressPermissions[]"
        );
        const controllerAddresses = (
          Array.isArray(addressPermissionsArrayData?.value)
            ? addressPermissionsArrayData.value
            : []
        ) as `0x${string}`[];
        console.log("fetchExistingControllers: Found controllers:", controllerAddresses);

        if (!controllerAddresses || controllerAddresses.length === 0) {
          console.log("No existing controllers found.");
          setIsInitialLoading(false);
          return;
        }

        const updates: Partial<Record<Role, `0x${string}`>> = {};
        let loggedInUserRole: Role | null = null; // Role of the VISITOR

        for (const address of controllerAddresses) {
          if (!address || !isAddress(address)) continue;

          try {
            console.log(`fetchExistingControllers: Checking controller address: ${address}`);
            const permissionsData = await erc725Instance!.getData({
              keyName: "AddressPermissions:Permissions:<address>",
              dynamicKeyParts: address,
            });
            const permissionsValue = permissionsData?.value as `0x${string}` | null;
            console.log(`fetchExistingControllers: Permissions for ${address}:`, permissionsValue);

            if (permissionsValue && permissionsValue !== '0x') {
              for (const role of ROLES) {
                const targetEncodedPerm = ROLE_ENCODED_PERMISSIONS[role];
                const isMatch = permissionsValue.toLowerCase() === targetEncodedPerm.toLowerCase();
                console.log(`fetchExistingControllers: Comparing ${permissionsValue} with ${role} (${targetEncodedPerm}): Match = ${isMatch}`);

                if (isMatch) {
                  updates[role] = address; // Still useful for the owner view
                  // Check if the current controller address matches the VISITOR's address
                  const isCurrentUser = visitorAddress && address.toLowerCase() === visitorAddress.toLowerCase();
                  console.log(`fetchExistingControllers: Controller ${address} matches role ${role}. Is it the current visitor (${visitorAddress})? ${isCurrentUser}`);
                  if (isCurrentUser) {
                    loggedInUserRole = role; // Found the visitor's role!
                  }
                  // Don't break here, allow checking other roles if permissions overlap (though unlikely with current setup)
                }
              }
            }
          } catch (permError) {
            console.warn(`Could not fetch permissions for ${address}:`, permError);
          }
        }

        // Update the selected addresses state (for the owner view)
        if (Object.keys(updates).length > 0) {
          setSelectedAddresses(prev => ({ ...prev, ...updates }));
          setAssignedManagers(prev => ({ ...prev, ...updates })); // Store the fetched assignments
        }
        // Set the current VISITOR's role state
        setCurrentUserRole(loggedInUserRole);
        console.log("fetchExistingControllers: Setting currentUserRole (visitor's role):", loggedInUserRole);

      } catch (error) {
        console.error("Error fetching existing controllers:", error);
        setCurrentUserRole(null); // Reset role on error
      } finally {
        setIsInitialLoading(false);
      }
    }

    fetchExistingControllers();
  }, [erc725Instance, visitorAddress]); // Depend on the instance AND the visitor's address

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
        !managedUpAddress ||
        !controllerAddress ||
        !erc725Instance
      ) {
        console.error("Prerequisites not met for granting permission.");
        return;
      }
      // Address format check
      if (!isAddress(managedUpAddress) || !isAddress(controllerAddress)) {
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
          to: managedUpAddress, // Target UP address
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
      managedUpAddress,
      erc725Instance,
      accounts,
    ]
  );

  // Handler for the new button
  const handleUpdateProfileClick = () => {
    console.log("Update Profile button clicked by Data Manager:", visitorAddress);
  };

  // Placeholder handlers for other roles
  const handleSendLyxClick = () => {
    console.log("Send LYX button clicked by Treasury Manager:", visitorAddress);
  };

  const handleCreateTokenClick = () => {
    console.log("Create Token/NFT button clicked by Token Manager:", visitorAddress);
  };

  // Handler to remove a manager (for Permission Manager view)
  const handleRemoveManager = (role: Role, address: `0x${string}`) => {
    console.log(`Remove Manager button clicked for role: ${role}, address: ${address}`);
    // TODO: Implement actual removal logic later
  };

  // --- UI Rendering ---
  console.log("Rendering with currentUserRole (visitor's role):", currentUserRole); // Log role before render
  return (
    <div className="w-full max-h-[900px] overflow-y-auto bg-white/80 backdrop-blur-md rounded-2xl p-6 space-y-6">
      {/* Conditionally render based on visitor's role */}
      {currentUserRole === 'Data Manager' ? (
        // View for Data Manager
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Data Manager Dashboard</h1>
          <p>You are managing the profile below as a Data Manager.</p>
          <lukso-button variant="primary" onClick={handleUpdateProfileClick}>
            Update Profile Data
          </lukso-button>
          {/* Show managed profile */}
          <div className="mt-6 bg-lime-50 p-4 rounded-lg shadow border border-lime-200 gap-2 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-lime-700 text-center">
              Profile Being Managed
            </h2>
            {managedUpAddress ? (
              <LuksoProfile address={managedUpAddress} />
            ) : (
              <p className="text-sm text-gray-500">Loading managed profile...</p>
            )}
          </div>
        </div>
      ) : currentUserRole === 'Token Manager' ? (
         <div className="text-center space-y-4">
             <h1 className="text-xl font-semibold">Token Manager Dashboard</h1>
             <p>You are managing the profile below as a Token Manager.</p>
             <lukso-button variant="primary" onClick={handleCreateTokenClick}>
                Create Token/NFT
             </lukso-button>
            {/* Show managed profile */}
            <div className="mt-6 bg-lime-50 p-4 rounded-lg shadow border border-lime-200 gap-2 flex flex-col items-center">
                <h2 className="text-lg font-semibold text-lime-700 text-center">
                Profile Being Managed
                </h2>
                {managedUpAddress ? (
                <LuksoProfile address={managedUpAddress} />
                ) : (
                <p className="text-sm text-gray-500">Loading managed profile...</p>
                )}
            </div>
         </div>
      ) : currentUserRole === 'Treasury Manager' ? (
         <div className="text-center space-y-4">
             <h1 className="text-xl font-semibold">Treasury Manager Dashboard</h1>
             <p>You are managing the profile below as a Treasury Manager.</p>
             <lukso-button variant="primary" onClick={handleSendLyxClick}>
                Send LYX
             </lukso-button>
             {/* Show managed profile */}
            <div className="mt-6 bg-lime-50 p-4 rounded-lg shadow border border-lime-200 gap-2 flex flex-col items-center">
                <h2 className="text-lg font-semibold text-lime-700 text-center">
                Profile Being Managed
                </h2>
                {managedUpAddress ? (
                <LuksoProfile address={managedUpAddress} />
                ) : (
                <p className="text-sm text-gray-500">Loading managed profile...</p>
                )}
            </div>
         </div>
      ) : (
        // Original view for Permission Manager (owner) or users with no specific role
        // Note: The owner viewing their own profile might also see this if they haven't assigned themselves another role.
        // We could add a check: if (visitorAddress === managedUpAddress) show owner view explicitly.
        <>
          <p className="text-md text-center text-gray-600 mb-6">
            Assign roles to other profiles to manage this Universal Profile <lukso-username address={managedUpAddress}></lukso-username>
          </p>

          {isInitialLoading && (
            <div className="text-center text-gray-500 font-semibold py-4">
              Loading permissions...
            </div>
          )}

          {!walletConnected && !isInitialLoading && (
            <div className="text-center text-red-500 font-semibold">
              Please connect your Universal Profile wallet to assign roles or view your dashboard.
            </div>
          )}

          {/* Only show role cards if connected and not loading */}
          {walletConnected && !isInitialLoading && (
            <div className="flex flex-wrap justify-around gap-2 mb-12">
              {ROLES.map((role) => {
                const selectedAddress = selectedAddresses[role];
                // Determine if the selected address is one that was loaded from the contract
                const isAssigned = !!(assignedManagers[role] && selectedAddress === assignedManagers[role]);
                return (
                    <RoleCard
                      key={role}
                      role={role}
                      selectedAddress={selectedAddress} // Pass the currently selected/assigned address
                      isAssignedManager={isAssigned} // Pass the boolean flag
                      searchQuery={searchQueries[role]}
                      searchResults={searchResults[role]}
                      isLoadingSearch={!!loadingStates[`search-${role}`]}
                      isLoadingGrant={!!loadingStates[`add-${role}`]}
                      showSearchDropdown={showSearchDropdown[role]}
                      walletConnected={walletConnected} // Pass walletConnected status
                      onClearSelection={() => clearSelection(role)}
                      onGrantPermission={() => grantPermission(role)}
                      onSearch={(query) => handleSearch(role, query)}
                      onSelectProfile={(profile) => handleSelectProfile(role, profile)}
                      onRemoveManager={handleRemoveManager}
                    />
                );
              })}
            </div>
          )}

          {/* Display Owner/Managed Profile Info */}
          <div className="bg-lime-50 p-4 rounded-lg shadow border border-lime-200 gap-2 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-lime-700 text-center">
              Profile Being Managed
            </h2>
            {managedUpAddress ? (
              <LuksoProfile address={managedUpAddress} />
            ) : (
              <p className="text-sm text-gray-500">Loading managed profile...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}