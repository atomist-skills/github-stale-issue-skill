import * as assert from "power-assert";
import { replacePlaceholders } from "../lib/util";

describe("replacePlaceholders", () => {
	it("should replace all placeholders", () => {
		const replaced = replacePlaceholders(
			"The big $color fox jumped the $object $times times",
			{ color: "brown", object: "fence", times: 2 },
		);
		assert.strictEqual(
			replaced,
			"The big brown fox jumped the fence 2 times",
		);
	});
});
