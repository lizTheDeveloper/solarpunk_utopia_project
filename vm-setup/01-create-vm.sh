#!/bin/bash
# Create Google Cloud VM in renewable energy region (Frankfurt)

# Configuration
VM_NAME="solarpunk-dev"
ZONE="europe-west3-a"  # Frankfurt, Germany - 100% renewable energy
MACHINE_TYPE="e2-standard-2"  # 2 vCPU, 8GB RAM
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
BOOT_DISK_SIZE="50GB"

echo "Creating VM: $VM_NAME in $ZONE (renewable energy region)"
echo "Machine type: $MACHINE_TYPE"
echo ""

gcloud compute instances create $VM_NAME \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --image-family=$IMAGE_FAMILY \
  --image-project=$IMAGE_PROJECT \
  --boot-disk-size=$BOOT_DISK_SIZE \
  --boot-disk-type=pd-balanced \
  --metadata=enable-oslogin=TRUE

echo ""
echo "VM created successfully!"
echo ""
echo "To connect to your VM, run:"
echo "  gcloud compute ssh $VM_NAME --zone=$ZONE"
echo ""
echo "After connecting, run: bash setup.sh"
