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

import { useCallback, useEffect, useState, useMemo } from "react";
import { parseUnits } from "viem";
import { useUpProvider } from "./upProvider";
import { LuksoProfile } from "./LuksoProfile";
import { waitForTransactionReceipt } from "viem/actions";
import { ERC725 } from "@erc725/erc725.js";
import erc725schema from "@erc725/erc725.js/schemas/LSP3ProfileMetadata.json"; // Assuming LSP3 is needed for profile display, maybe LSP6 for permissions? Let's check ERC725js docs if needed.
import LSP6Schema from "@erc725/erc725.js/schemas/LSP6KeyManager.json";
import { encodeFunctionData, keccak256, toHex, isAddress } from "viem";
import { request, gql } from "graphql-request";
import makeBlockie from "ethereum-blockies-base64";
import Image from "next/image";

const minAmount = 1.0;
const maxAmount = 1000;

interface DonateProps {
  selectedAddress?: `0x${string}` | null;
}

export function Donate({ selectedAddress }: DonateProps) {
  const { client, accounts, contextAccounts, walletConnected } =
    useUpProvider();
  const [amount, setAmount] = useState<number>(minAmount);
  const [error, setError] = useState("");
  const recipientAddress = selectedAddress || contextAccounts[0];
  const [isLoading, setIsLoading] = useState(false);

  const validateAmount = useCallback((value: number) => {
    if (value < minAmount) {
      setError(`Amount must be at least ${minAmount} LYX.`);
    } else if (value > maxAmount) {
      setError(`Amount cannot exceed ${maxAmount} LYX.`);
    } else {
      setError("");
    }
    setAmount(value);
  }, []);

  useEffect(() => {
    validateAmount(amount);
  }, [amount, validateAmount]);

  const sendToken = useCallback(async () => {
    if (!client || !walletConnected || !amount) {
      return;
    }

    try {
      setIsLoading(true);
      const tx = await client.sendTransaction({
        account: accounts[0] as `0x${string}`,
        to: recipientAddress as `0x${string}`,
        value: parseUnits(amount.toString(), 18),
        chain: client.chain,
      });

      // Wait for transaction confirmation
      await waitForTransactionReceipt(client, { hash: tx });

      // Reset amount after successful transaction
      setAmount(minAmount);
    } catch (err) {
      console.error("Transaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [accounts, amount, client, recipientAddress, walletConnected]);

  const sendTokenKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        sendToken();
      }
    },
    [sendToken]
  );

  const handleOnInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseFloat(e.target.value);
      validateAmount(value);
    },
    [validateAmount]
  );

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl">
      <div className="rounded-xl">
        <div className="flex flex-row items-center justify-center gap-2">
          <LuksoProfile address={recipientAddress} />
        </div>
      </div>

      {/* Amount Input and Donate Button Section */}
      <div className="flex gap-2">
        <div className="flex-1">
          <lukso-input
            value={minAmount.toString()}
            type="number"
            min={minAmount}
            max={maxAmount}
            onInput={handleOnInput}
            is-full-width
            is-disabled={!walletConnected}
            className="mt-2"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <lukso-button
          onClick={sendToken}
          onKeyPress={sendTokenKeyPress}
          variant="primary"
          size="medium"
          className="mt-2"
          isLoading={isLoading}
          disabled={!walletConnected}
        >
          {`Donate ${amount} LYX`}
        </lukso-button>
      </div>
    </div>
  );
}

export function PermissionManager() {
  const { client, accounts, contextAccounts, chainId, walletConnected } =
    useUpProvider();
  const userUpAddress = contextAccounts?.[0];

  // State for each role
  const [selectedAddresses, setSelectedAddresses] = useState<
    Record<Role, `0x${string}` | null>
  >({
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
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  ); // e.g., loadingStates['search-Treasury Manager'] = true
  const [showSearchDropdown, setShowSearchDropdown] = useState<
    Record<Role, boolean>
  >({
    "Treasury Manager": false,
    "Token Manager": false,
    "Data Manager": false,
  });

  const erc725Instance = useMemo(() => {
    if (!userUpAddress || !chainId) return null;
    const rpcEndpoint =
      chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_TESTNET;
    // Use LSP6 schema for permission encoding
    return new ERC725(LSP6Schema, userUpAddress, rpcEndpoint, {
      ipfsGateway: IPFS_GATEWAY,
    });
  }, [userUpAddress, chainId]);

  // --- Search Logic ---
  const handleSearch = useCallback(
    async (role: Role, query: string) => {
      setSearchQueries((prev) => ({ ...prev, [role]: query }));
      setShowSearchDropdown((prev) => ({ ...prev, [role]: true })); // Show dropdown on input

      if (query.length < 3) {
        setSearchResults((prev) => ({ ...prev, [role]: [] }));
        return;
      }

      setLoadingStates((prev) => ({ ...prev, [`search-${role}`]: true }));
      try {
        const envioUrl = chainId === 42 ? ENVIO_MAINNET_URL : ENVIO_TESTNET_URL;
        const result = (await request(envioUrl, gqlQuery, {
          search: query,
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
    setSelectedAddresses((prev) => ({ ...prev, [role]: profile.id }));
    setShowSearchDropdown((prev) => ({ ...prev, [role]: false }));
    setSearchQueries((prev) => ({ ...prev, [role]: "" })); // Clear search query
    setSearchResults((prev) => ({ ...prev, [role]: [] })); // Clear results
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
        // Add user feedback here (e.g., toast notification)
        return;
      }
      // Address format check
      if (!isAddress(userUpAddress) || !isAddress(controllerAddress)) {
        console.error("Invalid address format detected.");
        // Add user feedback here
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
        ) as string[];

        // 2. Check if the controller already exists
        const lowerCaseControllerAddress = controllerAddress.toLowerCase();
        const isExistingController = currentControllers.some(
            (addr) => addr && typeof addr === 'string' && addr.toLowerCase() === lowerCaseControllerAddress
        );

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
              }
          } catch (err) {
              console.warn(`Could not fetch/decode existing permissions for ${controllerAddress}, proceeding with new permissions. Error:`, err);
          }
        }

        // 4. Encode final permissions
        const encodedFinalPermissions = erc725Instance.encodePermissions(finalPermissions);

        // 5. Prepare data payload for setDataBatch
        const keysToSet: `0x${string}`[] = [];
        const valuesToSet: `0x${string}`[] = [];

        // Always set/update the specific controller's permissions
        // Construct the permission key manually
        const permissionKey = keccak256(toHex(`AddressPermissions:Permissions:${controllerAddress.substring(2)}`));
        keysToSet.push(permissionKey as `0x${string}`);
        valuesToSet.push(encodedFinalPermissions as `0x${string}`);

        // If it's a new controller, also update the AddressPermissions[] array
        if (!isExistingController) {
          // Construct the array key manually (hashed 'AddressPermissions[]')
          const arrayKey = keccak256(toHex("AddressPermissions[]")) as `0x${string}`;
          // Create the new array including the added controller
          const updatedControllersArray = [...currentControllers, controllerAddress];
          // Encode this entire updated array into bytes
          const encodedUpdatedArray = erc725Instance.encodeData([
              {
                  keyName: "AddressPermissions[]",
                  value: updatedControllersArray
              }
          ]).values[0];

          // Add the array key and the encoded array value to the batch
          keysToSet.push(arrayKey);
          valuesToSet.push(encodedUpdatedArray as `0x${string}`);
        }

        // 6. Encode the setDataBatch function call
        const setDataBatchPayload = encodeFunctionData({
          abi: setDataBatchAbi,
          functionName: "setDataBatch",
          args: [keysToSet, valuesToSet],
        });

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
        // Consider adding success feedback (toast)
        // Consider clearing selection or refreshing data after success
        // await waitForTransactionReceipt(client, { hash: txHash });
        // clearSelection(role);

      } catch (err) {
        console.error(`Failed to grant permission for ${role}:`, err);
        // Add more specific user error feedback (toast)
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
    <div className="w-[600px] max-h-[900px] overflow-y-auto bg-white/80 backdrop-blur-md rounded-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
        Manage Profile Permissions
      </h1>
      <p className="text-sm text-center text-gray-600 mb-6">
        Assign roles to other profiles to manage this Universal Profile (
        {userUpAddress
          ? `${userUpAddress.slice(0, 6)}...${userUpAddress.slice(-4)}`
          : "Loading UP..."}
        )
      </p>

      {!walletConnected && (
        <div className="text-center text-red-500 font-semibold">
          Please connect your Universal Profile wallet.
        </div>
      )}

      {ROLES.map((role) => (
        <div
          key={role}
          className="bg-white p-4 rounded-lg shadow space-y-3 border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-700">{role}</h2>

          {selectedAddresses[role] ? (
            // Show selected profile and Add/Clear buttons
            <div className="space-y-3">
              <LuksoProfile address={selectedAddresses[role] as string} />
              <div className="flex gap-2 justify-end">
                <lukso-button
                  variant="secondary"
                  size="small"
                  onClick={() => clearSelection(role)}
                  disabled={loadingStates[`add-${role}`]}
                >
                  Clear Selection
                </lukso-button>
                <lukso-button
                  variant="primary"
                  size="small"
                  onClick={() => grantPermission(role)}
                  isLoading={loadingStates[`add-${role}`]}
                  disabled={!walletConnected || loadingStates[`add-${role}`]}
                >
                  Add {role}
                </lukso-button>
              </div>
            </div>
          ) : (
            // Show search input and results
            <div className="relative space-y-2">
              <lukso-input
                placeholder={`Search for ${role}... (min 3 chars)`}
                value={searchQueries[role]}
                onInput={(e: any) => handleSearch(role, e.target.value)} // Type assertion needed for custom event
                is-full-width
                is-disabled={!walletConnected || !!loadingStates[`search-${role}`]}
              />
              {loadingStates[`search-${role}`] && (
                <p className="text-xs text-gray-500">Searching...</p>
              )}

              {showSearchDropdown[role] && searchResults[role].length > 0 && (
                <div className="absolute bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-full max-h-[180px] overflow-y-auto mt-1">
                  {searchResults[role].map((profile) => (
                    <button
                      key={profile.id}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors"
                      onClick={() => handleSelectProfile(role, profile)}
                    >
                      {getProfileImage(profile)}
                      <div className="flex-1 min-w-0">
                        <span className="block font-medium text-sm text-gray-800 truncate">
                          {profile.fullName ||
                            profile.name ||
                            "Unnamed Profile"}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {profile.id}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showSearchDropdown[role] &&
                searchResults[role].length === 0 &&
                searchQueries[role].length >= 3 &&
                !loadingStates[`search-${role}`] && (
                  <p className="text-xs text-gray-500 pl-1 pt-1">
                    No profiles found.
                  </p>
                )}
            </div>
          )}
        </div>
      ))}

      {/* Display Permission Manager (User's own UP) */}
      <div className="bg-lime-50 p-4 rounded-lg shadow border border-lime-200 space-y-2">
        <h2 className="text-lg font-semibold text-lime-700">
          Permission Manager (You)
        </h2>
        {userUpAddress ? (
          <LuksoProfile address={userUpAddress} />
        ) : (
          <p className="text-sm text-gray-500">Loading your profile...</p>
        )}
        <p className="text-xs text-gray-600 italic">
          You inherently have CHANGEPERMISSIONS rights on this profile.
        </p>
      </div>
    </div>
  );
}

// Constants
const IPFS_GATEWAY = "https://api.universalprofile.cloud/ipfs/";
const RPC_ENDPOINT_TESTNET = "https://rpc.testnet.lukso.network";
const RPC_ENDPOINT_MAINNET = "https://rpc.mainnet.lukso.network";
const ENVIO_TESTNET_URL =
  "https://envio.lukso-testnet.universal.tech/v1/graphql";
const ENVIO_MAINNET_URL =
  "https://envio.lukso-mainnet.universal.tech/v1/graphql";

// Define Roles and their corresponding LSP6 permissions
type Role = "Treasury Manager" | "Token Manager" | "Data Manager";
const ROLES: Role[] = ["Treasury Manager", "Token Manager", "Data Manager"];
const ROLE_PERMISSIONS: Record<Role, Record<string, boolean>> = {
  "Treasury Manager": { SUPER_TRANSFERVALUE: true },
  "Token Manager": { CALL: true },
  "Data Manager": { SETDATA: true },
};

// GraphQL query for profile search (similar to ProfileSearch.tsx)
const gqlQuery = gql`
  query SearchProfiles($search: String!) {
    search_profiles(args: { search: $search }) {
      id
      name
      fullName
      profileImages(
        where: { error: { _is_null: true } }
        order_by: { width: asc }
        limit: 1
      ) {
        url
      }
    }
  }
`;

// Profile type definition
type Profile = {
  id: `0x${string}`;
  name?: string;
  fullName?: string;
  profileImages?: { url: string }[];
};

// Helper function to get profile image (adapted from ProfileSearch)
const getProfileImage = (profile: Profile) => {
  const imageUrl = profile.profileImages?.[0]?.url?.replace(
    "ipfs://",
    IPFS_GATEWAY
  );
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={`${profile.name || profile.id} avatar`}
        className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
        width={40}
        height={40}
        onError={(e) => {
          e.currentTarget.src = makeBlockie(profile.id);
        }}
      />
    );
  }
  return (
    <Image
      src={makeBlockie(profile.id)}
      alt={`${profile.name || profile.id} avatar`}
      className="w-10 h-10 rounded-full flex-shrink-0"
      width={40}
      height={40}
    />
  );
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
