/**
 * 头像
 *
 * preset 类型对应 public/avatars/<key>.svg（软萌手绘头像）
 * upload 类型存的是上传后的路径
 */

export interface AvatarUser {
  nickname: string;
  avatar: string;
  avatar_kind: string;
}

export function avatarSrc(user: Pick<AvatarUser, "avatar" | "avatar_kind">): string {
  return user.avatar_kind === "upload"
    ? user.avatar
    : `/avatars/${user.avatar}.svg`;
}

export function Avatar({
  user,
  size = 32,
  className = "",
}: {
  user: AvatarUser;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarSrc(user)}
      alt={`${user.nickname} 的头像`}
      width={size}
      height={size}
      className={`shrink-0 rounded-full border border-line bg-brand-soft object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
