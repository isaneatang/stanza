export const poetryArchiveAbi = [
  {
    type: "function",
    name: "addressToUsername",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "usernameToAddress",
    stateMutability: "view",
    inputs: [{ name: "", type: "string" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "nextPoemId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "poemAuthor",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "claimUsername",
    stateMutability: "nonpayable",
    inputs: [{ name: "username", type: "string" }],
    outputs: []
  },
  {
    type: "function",
    name: "postPoem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "parentPoemId", type: "uint256" },
      { name: "license", type: "uint8" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "tipPoemUSDT",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poemId", type: "uint256" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "tipPoemBOT",
    stateMutability: "payable",
    inputs: [{ name: "poemId", type: "uint256" }],
    outputs: []
  },
  {
    type: "event",
    name: "UsernameClaimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "username", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "PoemPosted",
    inputs: [
      { name: "author", type: "address", indexed: true },
      { name: "poemId", type: "uint256", indexed: true },
      { name: "parentPoemId", type: "uint256", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "content", type: "string", indexed: false },
      { name: "license", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "PoemTipped",
    inputs: [
      { name: "poemId", type: "uint256", indexed: true },
      { name: "tipper", type: "address", indexed: true },
      { name: "author", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false }
    ]
  }
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  }
] as const;
