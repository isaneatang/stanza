import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoetryArchive", function () {
  async function deployFixture() {
    const [deployer, alice, bob] = await ethers.getSigners();

    const mockUsdt = await ethers.deployContract("MockUSDT");
    const archive = await ethers.deployContract(
      "PoetryArchive",
      [await mockUsdt.getAddress(), deployer.address],
      { from: deployer }
    );

    await mockUsdt.mint(alice.address, ethers.parseUnits("1000", 18));
    await mockUsdt.mint(bob.address, ethers.parseUnits("1000", 18));

    return { archive, mockUsdt, deployer, alice, bob };
  }

  async function claimAndPost(fixture: Awaited<ReturnType<typeof deployFixture>>, text = "roses are red") {
    const { archive, alice } = fixture;
    await archive.connect(alice).claimUsername("alice");
    await archive.connect(alice).postPoem("Title", text, 0, 0); // AllRightsReserved
  }

  // ---------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------

  it("rejects zero USDT address", async function () {
    const [deployer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PoetryArchive");
    await expect(
      factory.deploy(ethers.ZeroAddress, deployer.address)
    ).to.be.revertedWith("USDT address required");
  });

  it("rejects zero fee recipient", async function () {
    const mockUsdt = await ethers.deployContract("MockUSDT");
    const factory = await ethers.getContractFactory("PoetryArchive");
    await expect(
      factory.deploy(await mockUsdt.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWith("Fee recipient required");
  });

  // ---------------------------------------------------------------
  // Username registry
  // ---------------------------------------------------------------

  it("claims a username and registers both directions", async function () {
    const { archive, alice } = await deployFixture();
    await expect(archive.connect(alice).claimUsername("alice"))
      .to.emit(archive, "UsernameClaimed")
      .withArgs(alice.address, "alice", anyUint());

    expect(await archive.usernameToAddress("alice")).to.equal(alice.address);
    expect(await archive.addressToUsername(alice.address)).to.equal("alice");
  });

  it("rejects empty and over-length usernames", async function () {
    const { archive, alice } = await deployFixture();
    await expect(archive.connect(alice).claimUsername("")).to.be.revertedWith(
      "Invalid username length"
    );
    await expect(
      archive.connect(alice).claimUsername("a".repeat(33))
    ).to.be.revertedWith("Invalid username length");
    await archive.connect(alice).claimUsername("a".repeat(32));
  });

  it("rejects taken usernames and second claims per address", async function () {
    const { archive, alice, bob } = await deployFixture();
    await archive.connect(alice).claimUsername("alice");

    await expect(archive.connect(bob).claimUsername("alice")).to.be.revertedWith(
      "Username taken"
    );
    await expect(archive.connect(alice).claimUsername("alice2")).to.be.revertedWith(
      "Address already has a username"
    );
  });

  // ---------------------------------------------------------------
  // Poem posting
  // ---------------------------------------------------------------

  it("requires a claimed username before posting", async function () {
    const { archive, bob } = await deployFixture();
    await expect(
      archive.connect(bob).postPoem("T", "c", 0, 0)
    ).to.be.revertedWith("Must claim a username before posting");
  });

  it("posts a root poem: id starts at 1", async function () {
    const f = await deployFixture();
    await claimAndPost(f);

    const { archive, alice } = f;
    expect(await archive.nextPoemId()).to.equal(1n);
    expect(await archive.poemAuthor(1)).to.equal(alice.address);
  });

  it("emits PoemPosted with title, content, license and timestamp", async function () {
    const f = await deployFixture();
    const { archive, alice } = f;
    await archive.connect(alice).claimUsername("alice");

    await expect(
      archive.connect(alice).postPoem("Ode", "body text", 0, 1) // CC0
    )
      .to.emit(archive, "PoemPosted")
      .withArgs(
        alice.address,
        1,
        0,
        "Ode",
        "body text",
        1,
        anyUint()
      );
  });

  it("rejects empty content", async function () {
    const f = await deployFixture();
    await claimAndPost(f);
    await expect(
      f.archive.connect(f.alice).postPoem("T", "", 0, 0)
    ).to.be.revertedWith("Content required");
  });

  it("validates parent existence only when parentPoemId != 0", async function () {
    const f = await deployFixture();
    await claimAndPost(f);
    await expect(
      f.archive.connect(f.alice).postPoem("Reply", "text", 99, 0)
    ).to.be.revertedWith("Parent poem does not exist");

    await f.archive.connect(f.alice).postPoem("Reply", "text", 1, 0);
    expect(await f.archive.nextPoemId()).to.equal(2n);
  });

  it("rejects exact-duplicate content across authors", async function () {
    const f = await deployFixture();
    await claimAndPost(f, "shared line");
    await f.archive.connect(f.bob).claimUsername("bob");
    await expect(
      f.archive.connect(f.bob).postPoem("Copy", "shared line", 0, 0)
    ).to.be.revertedWith("Duplicate content already posted");
  });

  it("stores the content hash for each poem", async function () {
    const f = await deployFixture();
    await claimAndPost(f, "hash me");
    const expected = ethers.keccak256(ethers.toUtf8Bytes("hash me"));
    expect(await f.archive.poemContentHash(1)).to.equal(expected);
    expect(await f.archive.hashExists(expected)).to.equal(true);
  });

  // ---------------------------------------------------------------
  // Tipping — USDT
  // ---------------------------------------------------------------

  it("tips another author's poem in USDT with correct split", async function () {
    const f = await deployFixture();
    // bob posts
    await f.archive.connect(f.bob).claimUsername("bob");
    await f.archive.connect(f.bob).postPoem("Bob poem", "bob words", 0, 0);
    const { archive, mockUsdt, alice, bob, deployer } = f;

    const amount = ethers.parseUnits("10", 18);
    const fee = (amount * 300n) / 10000n;
    const authorAmount = amount - fee;

    await mockUsdt.connect(alice).approve(await archive.getAddress(), amount);

    const bobBefore = await mockUsdt.balanceOf(bob.address);
    const feeBefore = await mockUsdt.balanceOf(deployer.address);
    const aliceBefore = await mockUsdt.balanceOf(alice.address);

    await expect(
      archive.connect(alice).tipPoemUSDT(1, amount)
    )
      .to.emit(archive, "PoemTipped")
      .withArgs(
        1,
        alice.address,
        bob.address,
        await mockUsdt.getAddress(),
        amount,
        fee
      );

    expect(await mockUsdt.balanceOf(bob.address)).to.equal(bobBefore + authorAmount);
    expect(await mockUsdt.balanceOf(deployer.address)).to.equal(feeBefore + fee);
    expect(await mockUsdt.balanceOf(alice.address)).to.equal(aliceBefore - amount);
  });

  it("blocks self-tipping, unknown poems and zero amounts (USDT)", async function () {
    const f = await deployFixture();
    await claimAndPost(f);
    const { archive, mockUsdt, alice } = f;

    const amt = ethers.parseUnits("1", 18);
    await mockUsdt.connect(alice).approve(await archive.getAddress(), amt);

    await expect(archive.connect(alice).tipPoemUSDT(1, amt)).to.be.revertedWith(
      "Cannot tip yourself"
    );
    await expect(
      archive.connect(alice).tipPoemUSDT(42, amt)
    ).to.be.revertedWith("Poem does not exist");
    await expect(archive.connect(f.bob).tipPoemUSDT(1, 0)).to.be.revertedWith(
      "Amount must be greater than zero"
    );
  });

  // ---------------------------------------------------------------
  // Tipping — native BOT
  // ---------------------------------------------------------------

  it("tips native BOT with correct split", async function () {
    const f = await deployFixture();
    await f.archive.connect(f.bob).claimUsername("bob");
    await f.archive.connect(f.bob).postPoem("Bot poem", "paid in gas", 0, 0);
    const { archive, alice, bob, deployer } = f;

    const amount = ethers.parseEther("1");
    const fee = (amount * 300n) / 10000n;
    const authorAmount = amount - fee;

    const bobBefore = await ethers.provider.getBalance(bob.address);
    const feeBefore = await ethers.provider.getBalance(deployer.address);

    await expect(archive.connect(alice).tipPoemBOT(1, { value: amount }))
      .to.emit(archive, "PoemTipped")
      .withArgs(1, alice.address, bob.address, ethers.ZeroAddress, amount, fee);

    expect(await ethers.provider.getBalance(bob.address)).to.equal(bobBefore + authorAmount);
    expect(await ethers.provider.getBalance(deployer.address)).to.equal(feeBefore + fee);
    expect(await ethers.provider.getBalance(await archive.getAddress())).to.equal(0n);
  });

  it("blocks self-tipping and zero value (native BOT)", async function () {
    const f = await deployFixture();
    await claimAndPost(f);
    const { archive, alice } = f;

    await expect(
      archive.connect(alice).tipPoemBOT(1, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("Cannot tip yourself");

    await f.archive.connect(f.bob).claimUsername("bob");
    await f.archive.connect(f.bob).postPoem("B2", "more words", 0, 0);
    await expect(
      f.archive.connect(f.alice).tipPoemBOT(2, { value: 0 })
    ).to.be.revertedWith("Amount must be greater than zero");
  });
});

function anyUint() {
  return (v: unknown) => typeof v === "bigint" && v >= 0n;
}
