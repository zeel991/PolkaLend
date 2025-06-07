// Polkavm contract ABIs
export const LENDING_VAULT_ABI = {
  "source": {
    "hash": "0x...", // Add your contract hash
    "language": "ink! 4.0.0",
    "compiler": "rustc 1.70.0"
  },
  "contract": {
    "name": "lending_vault",
    "version": "1.0.0",
    "authors": ["Your Name"]
  },
  "spec": {
    "constructors": [
      {
        "args": [
          {
            "name": "collateral",
            "type": {
              "displayName": ["AccountId"],
              "type": 0
            }
          },
          {
            "name": "stablecoin",
            "type": {
              "displayName": ["AccountId"],
              "type": 0
            }
          },
          {
            "name": "oracle",
            "type": {
              "displayName": ["AccountId"],
              "type": 0
            }
          }
        ],
        "docs": [],
        "label": "new",
        "payable": false,
        "selector": "0x..."
      }
    ],
    "docs": [],
    "environment": {
      "accountId": {
        "displayName": ["AccountId"],
        "type": 0
      },
      "balance": {
        "displayName": ["Balance"],
        "type": 1
      },
      "blockNumber": {
        "displayName": ["BlockNumber"],
        "type": 2
      },
      "chainExtension": {
        "displayName": ["ChainExtension"],
        "type": 3
      },
      "hash": {
        "displayName": ["Hash"],
        "type": 4
      },
      "maxEventTopics": 4,
      "timestamp": {
        "displayName": ["Timestamp"],
        "type": 5
      }
    },
    "events": [],
    "lang_error": {
      "displayName": ["LangError"],
      "type": 6
    },
    "messages": [
      {
        "args": [
          {
            "name": "amount",
            "type": {
              "displayName": ["Balance"],
              "type": 1
            }
          }
        ],
        "docs": [],
        "label": "deposit_collateral",
        "mutates": true,
        "payable": false,
        "returnType": {
          "displayName": ["Result"],
          "type": 7
        },
        "selector": "0x..."
      },
      {
        "args": [
          {
            "name": "borrow_amount",
            "type": {
              "displayName": ["Balance"],
              "type": 1
            }
          }
        ],
        "docs": [],
        "label": "borrow",
        "mutates": true,
        "payable": false,
        "returnType": {
          "displayName": ["Result"],
          "type": 7
        },
        "selector": "0x..."
      },
      {
        "args": [
          {
            "name": "repay_amount",
            "type": {
              "displayName": ["Balance"],
              "type": 1
            }
          }
        ],
        "docs": [],
        "label": "repay",
        "mutates": true,
        "payable": false,
        "returnType": {
          "displayName": ["Result"],
          "type": 7
        },
        "selector": "0x..."
      },
      {
        "args": [
          {
            "name": "user",
            "type": {
              "displayName": ["AccountId"],
              "type": 0
            }
          }
        ],
        "docs": [],
        "label": "get_health_ratio",
        "mutates": false,
        "payable": false,
        "returnType": {
          "displayName": ["Balance"],
          "type": 1
        },
        "selector": "0x..."
      }
    ]
  },
  "storage": {
    "struct": {
      "fields": [
        {
          "layout": {
            "struct": {
              "fields": [
                {
                  "layout": {
                    "leaf": {
                      "key": "0x...",
                      "ty": 0
                    }
                  },
                  "name": "collateral_token"
                },
                {
                  "layout": {
                    "leaf": {
                      "key": "0x...",
                      "ty": 0
                    }
                  },
                  "name": "stablecoin"
                },
                {
                  "layout": {
                    "leaf": {
                      "key": "0x...",
                      "ty": 0
                    }
                  },
                  "name": "oracle"
                }
              ]
            }
          },
          "name": "data"
        }
      ]
    }
  },
  "types": [
    {
      "id": 0,
      "type": {
        "def": {
          "composite": {
            "fields": [
              {
                "type": 8,
                "typeName": "[u8; 32]"
              }
            ]
          }
        },
        "path": ["ink_primitives", "types", "AccountId"]
      }
    },
    {
      "id": 1,
      "type": {
        "def": {
          "primitive": "u128"
        }
      }
    },
    {
      "id": 2,
      "type": {
        "def": {
          "primitive": "u32"
        }
      }
    },
    {
      "id": 3,
      "type": {
        "def": {
          "variant": {
            "variants": []
          }
        },
        "path": ["ink_env", "types", "NoChainExtension"]
      }
    },
    {
      "id": 4,
      "type": {
        "def": {
          "composite": {
            "fields": [
              {
                "type": 9,
                "typeName": "[u8; 32]"
              }
            ]
          }
        },
        "path": ["ink_primitives", "types", "Hash"]
      }
    },
    {
      "id": 5,
      "type": {
        "def": {
          "primitive": "u64"
        }
      }
    },
    {
      "id": 6,
      "type": {
        "def": {
          "variant": {
            "variants": [
              {
                "fields": [
                  {
                    "type": 10,
                    "typeName": "String"
                  }
                ],
                "index": 0,
                "name": "CouldNotReadInput"
              }
            ]
          }
        },
        "path": ["ink_primitives", "LangError"]
      }
    },
    {
      "id": 7,
      "type": {
        "def": {
          "variant": {
            "variants": [
              {
                "fields": [
                  {
                    "type": 11,
                    "typeName": "()"
                  }
                ],
                "index": 0,
                "name": "Ok"
              },
              {
                "fields": [
                  {
                    "type": 6,
                    "typeName": "LangError"
                  }
                ],
                "index": 1,
                "name": "Err"
              }
            ]
          }
        },
        "path": ["Result"]
      }
    },
    {
      "id": 8,
      "type": {
        "def": {
          "array": {
            "len": 32,
            "type": 12
          }
        }
      }
    },
    {
      "id": 9,
      "type": {
        "def": {
          "array": {
            "len": 32,
            "type": 12
          }
        }
      }
    },
    {
      "id": 10,
      "type": {
        "def": {
          "primitive": "str"
        }
      }
    },
    {
      "id": 11,
      "type": {
        "def": {
          "tuple": []
        }
      }
    },
    {
      "id": 12,
      "type": {
        "def": {
          "primitive": "u8"
        }
      }
    }
  ]
};

// Add similar ABI structures for COLLATERAL_TOKEN_ABI and STABLECOIN_ABI
export const COLLATERAL_TOKEN_ABI = {
  // Add your collateral token ABI here
};

export const STABLECOIN_ABI = {
  // Add your stablecoin ABI here
};

// Replace these with your actual deployed contract addresses
export const CONTRACT_ADDRESSES = {
  lendingVault: "YOUR_LENDING_VAULT_ADDRESS",
  collateralToken: "YOUR_COLLATERAL_TOKEN_ADDRESS",
  stablecoin: "YOUR_STABLECOIN_ADDRESS",
  priceOracle: "YOUR_PRICE_ORACLE_ADDRESS"
}; 