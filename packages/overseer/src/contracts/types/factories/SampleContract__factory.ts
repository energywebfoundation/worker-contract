/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  SampleContract,
  SampleContractInterface,
} from "../SampleContract";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "message",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "value",
        type: "uint32",
      },
    ],
    name: "CuriousEvent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "message",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "value",
        type: "uint32",
      },
    ],
    name: "DullEvent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "message",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "value",
        type: "uint32",
      },
    ],
    name: "InterestingEvent",
    type: "event",
  },
  {
    inputs: [],
    name: "dullFunction",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "interestingFunction",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5061046b806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063714aff361461003b578063afa8e43914610059575b600080fd5b610043610077565b6040516100509190610268565b60405180910390f35b6100616100ec565b60405161006e9190610268565b60405180910390f35b60607fa29aa62ff3767dd11eab27009ec0b547c7087945e36f39df80f35843f709082760006040516100a991906102b8565b60405180910390a16040518060400160405280600481526020017f64756c6c00000000000000000000000000000000000000000000000000000000815250905090565b60607f1355cc14b6df7e5cd2229f11af191b8a477ed11c9c5e6b977cc1615dd736127f602a60405161011e919061028a565b60405180910390a17f6c2ada07665625c14c05f7c11e3abae7eea9d1ed08e3249ebb75e8514f19463f600160405161015691906102e6565b60405180910390a16040518060400160405280600b81526020017f696e746572657374696e67000000000000000000000000000000000000000000815250905090565b6101a281610340565b82525050565b6101b181610352565b82525050565b6101c081610364565b82525050565b60006101d182610314565b6101db818561031f565b93506101eb818560208601610376565b6101f4816103a9565b840191505092915050565b600061020c601a8361031f565b9150610217826103ba565b602082019050919050565b600061022f60108361031f565b915061023a826103e3565b602082019050919050565b600061025260138361031f565b915061025d8261040c565b602082019050919050565b6000602082019050818103600083015261028281846101c6565b905092915050565b600060408201905081810360008301526102a3816101ff565b90506102b260208301846101b7565b92915050565b600060408201905081810360008301526102d181610222565b90506102e06020830184610199565b92915050565b600060408201905081810360008301526102ff81610245565b905061030e60208301846101a8565b92915050565b600081519050919050565b600082825260208201905092915050565b600063ffffffff82169050919050565b600061034b82610330565b9050919050565b600061035d82610330565b9050919050565b600061036f82610330565b9050919050565b60005b83811015610394578082015181840152602081019050610379565b838111156103a3576000848401525b50505050565b6000601f19601f8301169050919050565b7f496e746572657374696e6746756e6374696f6e2063616c6c6564000000000000600082015250565b7f44756c6c4576656e742063616c6c656400000000000000000000000000000000600082015250565b7f437572696f75734576656e742063616c6c65640000000000000000000000000060008201525056fea2646970667358221220b85ece35a3dade77d5e62c2c1364d86e650f25f622f1012b022acf9a80c24ec464736f6c63430008040033";

type SampleContractConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SampleContractConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SampleContract__factory extends ContractFactory {
  constructor(...args: SampleContractConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<SampleContract> {
    return super.deploy(overrides || {}) as Promise<SampleContract>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): SampleContract {
    return super.attach(address) as SampleContract;
  }
  override connect(signer: Signer): SampleContract__factory {
    return super.connect(signer) as SampleContract__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SampleContractInterface {
    return new utils.Interface(_abi) as SampleContractInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): SampleContract {
    return new Contract(address, _abi, signerOrProvider) as SampleContract;
  }
}
