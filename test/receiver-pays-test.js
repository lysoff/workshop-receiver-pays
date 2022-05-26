const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("ReceiverPays", function () {
  before(async function () {
    const signers = await ethers.getSigners();
    this.owner = signers[0];
    this.claimer = signers[1];

    this.factory = await ethers.getContractFactory("ReceiverPays", this.owner);
  });

  beforeEach(async function () {
    this.contract = await this.factory.deploy({ value: ethers.utils.parseEther("1") });
    await this.contract.deployed();
  });

  it("throws `Already Paid` for used nonce", async function () {
    const { contract, owner, claimer } = this;

    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "address"],
      [claimer.address, ethers.utils.parseEther("1"), 0, contract.address]
    );

    const signedMessage = await owner.signMessage(ethers.utils.arrayify(messageHash));

    const tx = await contract.connect(claimer).claimPayment(ethers.utils.parseEther("1"), 0, signedMessage);

    await expect(tx).to.changeEtherBalance(contract, ethers.utils.parseEther("-1"));
    await expect(tx).to.changeEtherBalance(claimer, ethers.utils.parseEther("1"));

    const invalidTx = contract.connect(claimer).claimPayment(ethers.utils.parseEther("1"), 0, signedMessage);

    await expect(invalidTx).to.be.revertedWith("Already paid");
  });

  it("throws `Insufficient_funds` if insufficient funds", async function () {
    const { contract, owner, claimer } = this;

    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "address"],
      [claimer.address, ethers.utils.parseEther("2"), 0, contract.address]
    );

    const signedMessage = await owner.signMessage(ethers.utils.arrayify(messageHash));

    const invalidTx = contract.connect(claimer).claimPayment(ethers.utils.parseEther("2"), 0, signedMessage);

    await expect(invalidTx).to.be.revertedWith("Insufficient_funds");
  });

  it("throws `Not an owner` if the signer is invalid", async function () {
    const { contract, claimer } = this;

    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "address"],
      [claimer.address, ethers.utils.parseEther("1"), 0, contract.address]
    );

    const signedMessage = await claimer.signMessage(ethers.utils.arrayify(messageHash));

    const invalidTx = contract.connect(claimer).claimPayment(ethers.utils.parseEther("1"), 0, signedMessage);

    await expect(invalidTx).to.be.revertedWith("Not an owner");
  });

  it("throws `Invalid signature` if signature length not equals 65", async function () {
    const { contract, claimer } = this;
    const invalidTx = contract.connect(claimer).claimPayment(ethers.utils.parseEther("2"), 0, [0]);

    await expect(invalidTx).to.be.revertedWith("Invalid signature");
  });
});
