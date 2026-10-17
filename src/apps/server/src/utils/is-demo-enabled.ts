export default function isDemoEnabled(): boolean {
  return process.env.HABSUM_ENABLE_DEMO === 'true';
}
