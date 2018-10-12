# Description

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

# Contribution Checklist

- [ ] first commit title starts with 'CRUCIBLE-N:'
- [ ] fixes #(fill in issue number)
- [ ] version bumped if a contract changed
- [ ] code approved
- [ ] tests approved

# Solidity Checklist

- [ ] every contract variable explicitly declared as public/private
- [ ] every contract method explicitly declared as public/external private/internal
- [ ] make sure constructor can only be called once
- [ ] [does not use random numbers](https://solidity.readthedocs.io/en/develop/security-considerations.html#private-information-and-randomness)
- [ ] [reviewed for re-entrancy bugs](https://solidity.readthedocs.io/en/develop/security-considerations.html#re-entrancy)
- [ ] [loops and recursion have limits](https://solidity.readthedocs.io/en/develop/security-considerations.html#gas-limit-and-loops)
- [ ] [be mindful of 1024 depth call stack](https://solidity.readthedocs.io/en/develop/security-considerations.html#callstack-depth)
- [ ] [never use tx.origin for authorization](https://solidity.readthedocs.io/en/develop/security-considerations.html#tx-origin)
- [ ] [make sure for loop counters are correct size](https://solidity.readthedocs.io/en/develop/security-considerations.html#minor-details)
- [ ] [make sure constant/view functions do NOT mutate state](https://solidity.readthedocs.io/en/develop/security-considerations.html#minor-details)
- [ ] [make sure we don't have dirty bits](https://solidity.readthedocs.io/en/develop/security-considerations.html#minor-details)
- [ ] [always limit the amount of ETH or other tokens](https://solidity.readthedocs.io/en/develop/security-considerations.html#restrict-the-amount-of-ether)
- [ ] [make sure all functions apply the checks-effects pattern](https://solidity.readthedocs.io/en/develop/security-considerations.html#use-the-checks-effects-interactions-pattern)
- [ ] [does this feature need a fail-safe mode](https://solidity.readthedocs.io/en/develop/security-considerations.html#include-a-fail-safe-mode)
