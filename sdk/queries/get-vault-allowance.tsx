import type { Address } from "viem";
import type { TypedRpcApiKeys } from "@/sdk/client";
import type { UseQueryOptions } from "@tanstack/react-query";

import { createPublicClient, http, erc4626Abi } from "viem";
import { getChain } from "@/sdk/utils";
import { NULL_ADDRESS } from "@/sdk/constants";

export const getVaultAllowance = async ({
  RPC_API_KEYS,
  chain_id,
  account,
  spender,
  vault_address,
}: {
  RPC_API_KEYS: TypedRpcApiKeys;
  chain_id: number;
  account: string;
  spender: string;
  vault_address: string;
}) => {
  const chain = getChain(chain_id);

  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_API_KEYS[chain_id]),
  });

  const contracts = [
    {
      address: vault_address as Address,
      abi: erc4626Abi,
      functionName: "asset",
    },
    {
      address: vault_address as Address,
      abi: erc4626Abi,
      functionName: "allowance",
      args: [account, spender],
    },
  ];

  const query = publicClient.multicall({ contracts });

  return query;
};

export const getVaultAllowanceQueryOptions = (
  RPC_API_KEYS: TypedRpcApiKeys,
  chain_id: number,
  account: string,
  vault_address: string,
  spender: string,
)  => ({
  queryKey: [
    "vault-allowance",
    `chain-id=${chain_id}`,
    `account=${account}`,
    `vault_address=${vault_address}`,
  ],
  queryFn: async () => {
    try {
      const result = await getVaultAllowance({
        RPC_API_KEYS,
        chain_id,
        account,
        spender,
        vault_address,
      });

      // Extract asset and allowance from multicall result
      const [assetResult, allowanceResult] = result;

      // Handle invalid asset address
      const assetAddress =
        assetResult?.status === "success"
          ? assetResult.result?.toString().toLowerCase()
          : NULL_ADDRESS; // NULL address

      // Create token_id by concatenating chain_id and asset address
      const token_id = `${chain_id}-${assetAddress}`.toLowerCase();

      // Handle invalid allowance
      const raw_amount =
        allowanceResult?.status === "success"
          ? allowanceResult.result?.toString() ?? "0"
          : "0";

      return {
        token_id,
        raw_amount,
      };
    } catch (error) {
      return {
        token_id: `${chain_id}-${NULL_ADDRESS}`.toLowerCase(),
        raw_amount: "0",
      };
    }
  },

  placeholderData: (previousData: any) => previousData,
  refetchInterval: 1000 * 60 * 1, // 1 min
  refetchOnWindowFocus: false,
});
