declare module '*.svg' {
  import { FC, SVGProps } from 'react'
  const content: FC<SVGProps<SVGElement>>
  export default content
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare module 'swiper/css' {}
declare module 'swiper/css/pagination' {}