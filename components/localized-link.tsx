"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useLanguage } from "@/components/language-provider";
import { withLanguagePrefix } from "@/src/i18n/config";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function isExternalHref(href: string): boolean {
  return /^([a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const { prefix } = useLanguage();

  const localizedHref =
    href.startsWith("/") && !isExternalHref(href)
      ? withLanguagePrefix(href, prefix)
      : href;

  return <Link href={localizedHref} {...props} />;
}
