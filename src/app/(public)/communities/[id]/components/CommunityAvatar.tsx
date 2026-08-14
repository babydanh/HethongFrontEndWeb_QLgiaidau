import Image from "next/image";

interface CommunityAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
}

export default function CommunityAvatar({
  src,
  name,
  size = 40,
}: CommunityAvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
